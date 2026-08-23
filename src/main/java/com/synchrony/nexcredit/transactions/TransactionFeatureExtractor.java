package com.synchrony.nexcredit.transactions;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.DoubleSummaryStatistics;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Stage 2 of the pipeline: turns a raw transaction stream into underwriting signals.
 * Pure, deterministic functions — no network, no randomness — so every number shown in
 * the product can be re-derived from the transaction list during review or audit.
 */
@Component
public class TransactionFeatureExtractor {

    private static final double SALARY_AMOUNT_TOLERANCE = 0.20;
    private static final double RECURRING_MIN_MONTH_COVERAGE = 0.6;
    private static final double LOW_BALANCE_THRESHOLD_OF_INCOME = 0.10;
    private static final int SUSPICIOUS_ROUND_FIGURE_MIN = 25_000;

    public CashflowFeatures extract(List<TransactionRecord> txns) {
        return extract(txns, null);
    }

    /**
     * @param declaredAnnualIncome optional; when present enables claimed-vs-detected income notes
     */
    public CashflowFeatures extract(List<TransactionRecord> txns, java.math.BigDecimal declaredAnnualIncome) {
        CashflowFeatures f = new CashflowFeatures();
        if (txns == null || txns.isEmpty()) {
            f.getDerivationNotes().add("No transactions supplied; no cash-flow features computed.");
            return f;
        }
        List<TransactionRecord> sorted = new ArrayList<>(txns);
        sorted.sort(Comparator.comparing(TransactionRecord::getDate));

        TreeMap<String, List<TransactionRecord>> byMonth = groupByMonth(sorted);
        f.setTransactionCount(sorted.size());
        f.setMonthsObserved(byMonth.size());

        double monthlyIncome = detectSalary(sorted, byMonth, f);
        computeFlows(byMonth, f);
        computeBalances(sorted, byMonth, monthlyIncome, f);
        computeVolatilityAndObligations(byMonth, monthlyIncome, f);
        computeSuspicious(sorted, byMonth, monthlyIncome, f);

        if (declaredAnnualIncome != null && declaredAnnualIncome.doubleValue() > 0) {
            double declaredMonthly = declaredAnnualIncome.doubleValue() / 12.0;
            if (f.isSalaryDetected() && monthlyIncome > 0) {
                double divergence = Math.abs(declaredMonthly - monthlyIncome) / declaredMonthly;
                if (divergence > 0.15) {
                    f.getSuspiciousFindings().add(String.format(
                            "Declared monthly income %.0f diverges %.0f%% from detected recurring salary credit %.0f",
                            declaredMonthly, divergence * 100, monthlyIncome));
                } else {
                    f.getDerivationNotes().add(String.format(
                            "Declared income reconciles within %.0f%% of detected salary credits.", divergence * 100));
                }
            }
        }
        return f;
    }

    private TreeMap<String, List<TransactionRecord>> groupByMonth(List<TransactionRecord> sorted) {
        TreeMap<String, List<TransactionRecord>> byMonth = new TreeMap<>();
        for (TransactionRecord t : sorted) {
            byMonth.computeIfAbsent(monthKey(t.getDate()), k -> new ArrayList<>()).add(t);
        }
        return byMonth;
    }

    private String monthKey(LocalDate d) {
        return String.format("%04d-%02d", d.getYear(), d.getMonthValue());
    }

    /**
     * Salary = an amount-cluster of CREDITS present in at least 60% of observed months with
     * low coefficient of variation. Median of the cluster is the detected monthly income.
     */
    private double detectSalary(List<TransactionRecord> sorted, TreeMap<String, List<TransactionRecord>> byMonth,
                                CashflowFeatures f) {
        // Build amount clusters from credits (round to nearest 100 for tolerance bucketing)
        Map<Long, List<TransactionRecord>> clusters = new LinkedHashMap<>();
        for (TransactionRecord t : sorted) {
            if (!t.isCredit()) {
                continue;
            }
            long bucket = Math.max(1, Math.round(t.getAmount() / 100.0));
            clusters.computeIfAbsent(bucket, k -> new ArrayList<>()).add(t);
        }
        // Merge neighbouring buckets whose amounts are within tolerance (e.g. 41950 vs 42200)
        List<List<TransactionRecord>> mergedClusters = mergeAmountClusters(clusters);

        List<TransactionRecord> bestCluster = null;
        double bestScore = 0;
        for (List<TransactionRecord> cluster : mergedClusters) {
            Set<String> monthsWith = new HashSet<>();
            for (TransactionRecord t : cluster) {
                monthsWith.add(monthKey(t.getDate()));
            }
            double coverage = (double) monthsWith.size() / byMonth.size();
            DoubleSummaryStatistics stats = cluster.stream().mapToDouble(TransactionRecord::getAmount).summaryStatistics();
            double mean = stats.getAverage();
            double sd = stdev(cluster.stream().mapToDouble(TransactionRecord::getAmount).toArray(), mean);
            double cv = mean > 0 ? sd / mean : 1;
            double score = coverage * Math.max(0, 1 - cv);
            boolean salaryLike = coverage >= RECURRING_MIN_MONTH_COVERAGE && cv <= SALARY_AMOUNT_TOLERANCE;
            if (salaryLike && score > bestScore) {
                bestScore = score;
                bestCluster = cluster;
            }
        }

        if (bestCluster == null) {
            f.setSalaryDetected(false);
            f.setSalaryRegularityPct(0);
            f.getMonthlyIncomeDetected();
            f.setMonthlyIncomeDetected(medianMonthlyCredits(byMonth));
            f.getDerivationNotes().add(String.format(
                    "No recurring salary-pattern credit found in %d months; income approximated as median monthly inflow.",
                    byMonth.size()));
            return f.getMonthlyIncomeDetected();
        }

        double[] amounts = bestCluster.stream().mapToDouble(TransactionRecord::getAmount).toArray();
        double mean = mean(amounts);
        double cv = stdev(amounts, mean) / mean;
        Set<String> monthsWith = new HashSet<>();
        for (TransactionRecord t : bestCluster) {
            monthsWith.add(monthKey(t.getDate()));
        }
        double coverage = (double) monthsWith.size() / byMonth.size();
        int regularity = (int) Math.round(Math.min(100, coverage * Math.max(0, 1 - cv) * 100));

        f.setSalaryDetected(true);
        f.setMonthlyIncomeDetected(mean);
        f.setSalaryRegularityPct(regularity);
        f.setSalaryCreditCount(bestCluster.size());
        f.getDerivationNotes().add(String.format(
                "Recurring credit ~%.0f seen in %d/%d months (variation %.0f%%) => salary regularity %d/100",
                mean, monthsWith.size(), byMonth.size(), cv * 100, regularity));
        return mean;
    }

    /** Merge credit clusters whose representative amounts sit within SALARY_AMOUNT_TOLERANCE of each other. */
    private List<List<TransactionRecord>> mergeAmountClusters(Map<Long, List<TransactionRecord>> buckets) {
        List<long[]> keys = new ArrayList<>();
        for (long k : buckets.keySet()) {
            keys.add(new long[]{k});
        }
        List<List<TransactionRecord>> out = new ArrayList<>();
        Set<Long> consumed = new HashSet<>();
        List<Long> ordered = new ArrayList<>(buckets.keySet());
        ordered.sort(Long::compare);
        for (int i = 0; i < ordered.size(); i++) {
            long base = ordered.get(i);
            if (consumed.contains(base)) {
                continue;
            }
            List<TransactionRecord> merged = new ArrayList<>(buckets.get(base));
            consumed.add(base);
            for (int j = i + 1; j < ordered.size(); j++) {
                long other = ordered.get(j);
                if (consumed.contains(other)) {
                    continue;
                }
                double baseAmount = base * 100.0;
                double otherAmount = other * 100.0;
                if (Math.abs(baseAmount - otherAmount) <= Math.min(baseAmount, otherAmount) * SALARY_AMOUNT_TOLERANCE) {
                    merged.addAll(buckets.get(other));
                    consumed.add(other);
                }
            }
            out.add(merged);
        }
        return out;
    }

    private double medianMonthlyCredits(TreeMap<String, List<TransactionRecord>> byMonth) {
        List<Double> monthlyTotals = new ArrayList<>();
        for (List<TransactionRecord> txns : byMonth.values()) {
            monthlyTotals.add(txns.stream().filter(TransactionRecord::isCredit)
                    .mapToDouble(TransactionRecord::getAmount).sum());
        }
        return percentile(monthlyTotals.stream().mapToDouble(Double::doubleValue).toArray(), 50);
    }

    private void computeFlows(TreeMap<String, List<TransactionRecord>> byMonth, CashflowFeatures f) {
        List<Double> credits = new ArrayList<>();
        List<Double> debits = new ArrayList<>();
        for (List<TransactionRecord> txns : byMonth.values()) {
            credits.add(txns.stream().filter(TransactionRecord::isCredit)
                    .mapToDouble(TransactionRecord::getAmount).sum());
            debits.add(-txns.stream().filter(t -> !t.isCredit())
                    .mapToDouble(TransactionRecord::getAmount).sum());
        }
        double avgCredit = mean(toArr(credits));
        double avgDebit = mean(toArr(debits));
        f.setAvgMonthlyCredit((int) Math.round(avgCredit));
        f.setAvgMonthlyDebit((int) Math.round(avgDebit));
        f.setMonthlySurplus((int) Math.round(avgCredit - avgDebit));
        f.getDerivationNotes().add(String.format(
                "Average monthly inflow %.0f vs outflow %.0f => surplus %d", avgCredit, avgDebit,
                f.getMonthlySurplus()));
    }

    /**
     * Balance analytics use source-provided running balances when available; otherwise a
     * deterministic ledger is simulated from an opening buffer of max(2x income, 20000).
     */
    private void computeBalances(List<TransactionRecord> sorted, TreeMap<String, List<TransactionRecord>> byMonth,
                                 double monthlyIncome, CashflowFeatures f) {
        boolean hasBalances = sorted.stream().anyMatch(t -> t.getBalanceAfter() != null);
        double opening = Math.max(2 * monthlyIncome, 20_000);
        double lowThreshold = Math.max(500, monthlyIncome * LOW_BALANCE_THRESHOLD_OF_INCOME);

        Map<String, Double> monthEndBalance = new LinkedHashMap<>();
        Map<String, Double> monthMinBalance = new HashMap<>();
        int lowDays = 0;
        double running = opening;
        String currentDay = null;
        double dayMin = Double.MAX_VALUE;

        for (TransactionRecord t : sorted) {
            if (t.getBalanceAfter() != null) {
                running = t.getBalanceAfter();
            } else {
                running += t.getAmount();
            }
            String day = t.getDate().toString();
            if (!day.equals(currentDay)) {
                if (currentDay != null && dayMin < lowThreshold) {
                    lowDays++;
                }
                currentDay = day;
                dayMin = Double.MAX_VALUE;
            }
            dayMin = Math.min(dayMin, running);
            String mk = monthKey(t.getDate());
            monthEndBalance.put(mk, running);
            monthMinBalance.merge(mk, running, Math::min);
        }
        if (currentDay != null && dayMin < lowThreshold) {
            lowDays++;
        }

        double avgEnd = mean(monthEndBalance.values().stream().mapToDouble(Double::doubleValue).toArray());
        int lowMonths = (int) monthMinBalance.values().stream().filter(v -> v < lowThreshold).count();

        // Savings trend: fraction change from first to last observed month-end balance.
        Double[] monthEnds = monthEndBalance.values().toArray(new Double[0]);
        if (monthEnds.length >= 2 && monthEnds[0] > 0) {
            double trend = (monthEnds[monthEnds.length - 1] - monthEnds[0]) / monthEnds[0];
            f.setSavingsTrend(Math.max(-1, Math.min(1, trend)));
            f.getDerivationNotes().add(String.format(
                    "Month-end balance moved %.0f%% from start to end of window (savings trend).", trend * 100));
        } else {
            f.setSavingsTrend(0);
        }

        f.setAvgMonthlyBalance((int) Math.round(Math.max(0, avgEnd)));
        f.setLowBalanceDays(lowDays);
        f.setLowBalanceMonths(lowMonths);
        f.getDerivationNotes().add(String.format(
                "%s running-balance ledger: average month-end balance %.0f; %d day(s) below %.0f buffer (%d month(s)).",
                hasBalances ? "Source-provided" : "Ledger-derived", avgEnd, lowDays, lowThreshold, lowMonths));
    }

    private void computeVolatilityAndObligations(TreeMap<String, List<TransactionRecord>> byMonth,
                                                 double monthlyIncome, CashflowFeatures f) {
        double[] monthlyDebits = byMonth.values().stream()
                .map(txns -> -txns.stream().filter(t -> !t.isCredit())
                        .mapToDouble(TransactionRecord::getAmount).sum())
                .mapToDouble(Double::doubleValue).toArray();
        double meanDebit = mean(monthlyDebits);
        double vol = meanDebit > 0 ? stdev(monthlyDebits, meanDebit) / meanDebit * 100 : 0;
        f.setExpenseVolatilityPct((int) Math.round(vol));

        // Recurring obligations: debit amount-clusters present in >=60% of months.
        Map<Long, Set<String>> debitClusters = new HashMap<>();
        for (List<TransactionRecord> txns : byMonth.values()) {
            for (TransactionRecord t : txns) {
                if (t.isCredit()) {
                    continue;
                }
                long bucket = Math.max(1, Math.round(-t.getAmount() / 100.0));
                debitClusters.computeIfAbsent(bucket, k -> new HashSet<>()).add(monthKey(t.getDate()));
            }
        }
        int recurring = 0;
        List<Long> orderedBuckets = new ArrayList<>(debitClusters.keySet());
        orderedBuckets.sort(Long::compare);
        Set<Long> absorbed = new HashSet<>();
        for (int i = 0; i < orderedBuckets.size(); i++) {
            long b = orderedBuckets.get(i);
            if (absorbed.contains(b)) {
                continue;
            }
            double amount = b * 100.0;
            int covered = debitClusters.get(b).size();
            for (int j = i + 1; j < orderedBuckets.size(); j++) {
                long o = orderedBuckets.get(j);
                double other = o * 100.0;
                if (Math.abs(amount - other) <= Math.min(amount, other) * 0.15) {
                    covered = Math.max(covered, debitClusters.get(o).size());
                    absorbed.add(o);
                }
            }
            if (byMonth.size() > 0 && covered >= Math.ceil(RECURRING_MIN_MONTH_COVERAGE * byMonth.size())) {
                recurring++;
            }
        }
        f.setRecurringObligationsCount(recurring);
        f.getDerivationNotes().add(String.format(
                "Expense volatility %.0f%% (std/mean of monthly outflows); %d recurring obligation(s) detected.",
                vol, recurring));
    }

    private void computeSuspicious(List<TransactionRecord> sorted, TreeMap<String, List<TransactionRecord>> byMonth,
                                   double monthlyIncome, CashflowFeatures f) {
        int suspicious = 0;

        // 1. Gambling / betting merchants
        for (TransactionRecord t : sorted) {
            if (t.getDescription().toLowerCase().matches(".*(bet|casino|lottery|rummy|poker|satta).*")) {
                suspicious++;
                f.getSuspiciousFindings().add(String.format(
                        "Gambling-pattern transaction on %s: %s (%.0f)", t.getDate(), t.getDescription(), t.getAmount()));
            }
        }

        // 2. Rapid post-salary cash-out: ATM/cash debit >= 40% income within 3 days of a salary-like credit
        List<LocalDate> salaryDates = new ArrayList<>();
        for (TransactionRecord t : sorted) {
            if (t.isCredit() && monthlyIncome > 0
                    && Math.abs(t.getAmount() - monthlyIncome) <= monthlyIncome * 0.25) {
                salaryDates.add(t.getDate());
            }
        }
        for (TransactionRecord t : sorted) {
            if (t.isCredit()) {
                continue;
            }
            boolean cashLike = t.getDescription().toLowerCase().matches(".*(atm|cash withdrawal|cash-withdrawal).*")
                    || "CASH".equalsIgnoreCase(t.getCategory());
            if (!cashLike) {
                continue;
            }
            double magnitude = -t.getAmount();
            if (magnitude < 0.4 * monthlyIncome) {
                continue;
            }
            boolean nearSalary = salaryDates.stream().anyMatch(d ->
                    !d.isAfter(t.getDate()) && !d.plusDays(3).isBefore(t.getDate()));
            if (nearSalary) {
                suspicious++;
                f.getSuspiciousFindings().add(String.format(
                        "Cash-out of %.0f (%.0f%% of income) within 3 days of salary credit on %s",
                        magnitude, magnitude / monthlyIncome * 100, t.getDate()));
            }
        }

        // 3. Large round-figure transfers
        for (TransactionRecord t : sorted) {
            double magnitude = -t.getAmount();
            if (magnitude >= SUSPICIOUS_ROUND_FIGURE_MIN && magnitude % 1000 == 0
                    && ("TRANSFER".equalsIgnoreCase(t.getCategory()) || "UPI".equalsIgnoreCase(t.getCategory()))) {
                suspicious++;
                f.getSuspiciousFindings().add(String.format(
                        "Large round-figure transfer on %s: %.0f (%s)", t.getDate(), magnitude, t.getDescription()));
            }
        }

        // 4. Burst of identical same-day transfers
        Map<String, Integer> dayAmountCount = new HashMap<>();
        for (TransactionRecord t : sorted) {
            if (t.isCredit()) {
                continue;
            }
            String key = t.getDate() + "|" + Math.round(-t.getAmount());
            dayAmountCount.merge(key, 1, Integer::sum);
        }
        for (Map.Entry<String, Integer> e : dayAmountCount.entrySet()) {
            if (e.getValue() >= 3) {
                suspicious++;
                f.getSuspiciousFindings().add(String.format(
                        "%d identical transfers of %.0f on %s (burst pattern)",
                        e.getValue(), Double.parseDouble(e.getKey().split("\\|")[1]), e.getKey().split("\\|")[0]));
            }
        }

        f.setSuspiciousTxnCount(suspicious);
        // Returned payments (word-boundary anchored so "transfer" doesn't match "nsf")
        int returned = (int) sorted.stream().filter(t -> t.getDescription().toLowerCase()
                .matches(".*(\\bnsf\\b|\\breturned\\b|\\bbounced\\b|\\binsufficient\\b|\\becs\\s*return\\b|\\bach\\s*return\\b).*")).count();
        f.setReturnedPayments(returned);
        if (returned > 0) {
            f.getSuspiciousFindings().add(returned + " returned/failed payment(s) in statement window");
        }
        f.getDerivationNotes().add(suspicious == 0
                ? "No gambling, rapid cash-out, large round-transfer or burst patterns detected."
                : suspicious + " suspicious transaction event(s) flagged.");
    }

    private double mean(double[] v) {
        return v.length == 0 ? 0 : java.util.Arrays.stream(v).average().orElse(0);
    }

    private double stdev(double[] v, double mean) {
        if (v.length < 2) {
            return 0;
        }
        double ss = 0;
        for (double x : v) {
            ss += (x - mean) * (x - mean);
        }
        return Math.sqrt(ss / (v.length - 1));
    }

    private double percentile(double[] v, double p) {
        if (v.length == 0) {
            return 0;
        }
        double[] copy = v.clone();
        java.util.Arrays.sort(copy);
        int idx = (int) Math.round((p / 100.0) * (copy.length - 1));
        return copy[idx];
    }

    private double[] toArr(List<Double> list) {
        return list.stream().mapToDouble(Double::doubleValue).toArray();
    }
}
