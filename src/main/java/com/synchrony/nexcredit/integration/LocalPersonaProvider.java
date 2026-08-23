package com.synchrony.nexcredit.integration;

import com.synchrony.nexcredit.transactions.TransactionRecord;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.LinkedHashMap;

/**
 * Deterministic synthetic transaction generator used when no live bank connector is
 * configured. Three demo personas map to the three required hackathon scenarios:
 *
 *  - "healthy-ntc"          : thin-file gig worker, stable platform income, positive surplus (Scenario A)
 *  - "unstable-obligations" : irregular freelance inflows, heavy EMIs, low buffers     (Scenario B)
 *  - "suspicious-inconsistency": declared income far above detected salary, gambling,
 *                               round-figure transfers, rapid post-salary cash-out      (Scenario C)
 *
 * Same seed => same transactions on every run, so demos and tests are reproducible.
 */
@Component
public class LocalPersonaProvider implements FinancialDataProvider {

    public static final String HEALTHY_NTC = "healthy-ntc";
    public static final String UNSTABLE_OBLIGATIONS = "unstable-obligations";
    public static final String SUSPICIOUS_INCONSISTENCY = "suspicious-inconsistency";

    private static final int MONTHS_OF_HISTORY = 6;

    @Override
    public String name() {
        return "local-persona";
    }

    @Override
    public boolean isAvailable() {
        return true;
    }

    public List<String> personas() {
        return List.of(HEALTHY_NTC, UNSTABLE_OBLIGATIONS, SUSPICIOUS_INCONSISTENCY);
    }

    @Override
    public List<TransactionRecord> fetch(String subjectKey, double declaredAnnualIncome) {
        return switch (subjectKey == null ? "" : subjectKey) {
            case UNSTABLE_OBLIGATIONS -> unstableObligations();
            case SUSPICIOUS_INCONSISTENCY -> suspiciousInconsistency(declaredAnnualIncome);
            case HEALTHY_NTC -> healthyNtc();
            default -> healthyNtc();
        };
    }

    /** Scenario A: steady gig-platform payouts, rent + modest spends, comfortable buffer. */
    private List<TransactionRecord> healthyNtc() {
        Random rng = new Random(11);
        List<LedgerEntry> ledger = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int m = MONTHS_OF_HISTORY; m >= 1; m--) {
            LocalDate monthAnchor = today.minusMonths(m);
            double payout = 43_500 + rng.nextInt(4_000);           // 43.5k–47.5k
            ledger.add(new LedgerEntry(day(monthAnchor, 1), "SWIGGY PARTNER PAYOUT",
                    payout, "SALARY"));
            ledger.add(new LedgerEntry(day(monthAnchor, 3), "ZOMATO PARTNER INCENTIVE",
                    2_800 + rng.nextInt(900), "SALARY"));
            ledger.add(new LedgerEntry(day(monthAnchor, 5), "RENT TRANSFER TO LANDLORD", -12_000, "RENT"));
            ledger.add(new LedgerEntry(day(monthAnchor, 8), "ELECTRICITY BILL PAYMENT",
                    -(1_400 + rng.nextInt(700)), "UTILITIES"));
            ledger.add(new LedgerEntry(day(monthAnchor, 10), "MOBILE RECHARGE JIO", -299, "UTILITIES"));
            ledger.add(new LedgerEntry(day(monthAnchor, 12), "BIGBASKET GROCERIES",
                    -(2_600 + rng.nextInt(1_200)), "GROCERIES"));
            ledger.add(new LedgerEntry(day(monthAnchor, 15), "UPI/OLACABS COMMUTE",
                    -(900 + rng.nextInt(600)), "TRANSPORT"));
            ledger.add(new LedgerEntry(day(monthAnchor, 18), "DMART WEEKLY SHOP",
                    -(1_800 + rng.nextInt(900)), "GROCERIES"));
            ledger.add(new LedgerEntry(day(monthAnchor, 22), "UPI/MEDPLUS PHARMACY",
                    -(450 + rng.nextInt(400)), "HEALTH"));
            ledger.add(new LedgerEntry(day(monthAnchor, 25), "NETFLIX SUBSCRIPTION", -649, "SUBSCRIPTION"));
            ledger.add(new LedgerEntry(day(monthAnchor, 26), "RD SAVINGS SWEEP HDFC", -15_000, "SAVINGS"));
        }
        return toRecords(ledger, 38_000);
    }

    /** Scenario B: lumpy freelance income, three recurring EMIs, thin buffers, an ECS return. */
    private List<TransactionRecord> unstableObligations() {
        Random rng = new Random(22);
        List<LedgerEntry> ledger = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int m = MONTHS_OF_HISTORY; m >= 1; m--) {
            LocalDate monthAnchor = today.minusMonths(m);
            // Lumpy freelance credits — amounts vary hugely, some months very weak
            double bigProject = switch (m % 3) {
                case 0 -> 18_000 + rng.nextInt(6_000);
                case 1 -> 9_000 + rng.nextInt(5_000);
                default -> 34_000 + rng.nextInt(8_000);
            };
            ledger.add(new LedgerEntry(day(monthAnchor, 4), "FREELANCE PROJECT CREDIT-UPWORK",
                    bigProject, "INCOME"));
            if (m % 2 == 0) {
                ledger.add(new LedgerEntry(day(monthAnchor, 17), "FREELANCE MILESTONE-FIVERR",
                        4_000 + rng.nextInt(3_000), "INCOME"));
            }
            // Heavy fixed obligations
            ledger.add(new LedgerEntry(day(monthAnchor, 5), "EMI BAJAJ FIN PERSONAL LOAN", -9_800, "EMI"));
            ledger.add(new LedgerEntry(day(monthAnchor, 7), "EMI TVS CREDIT TWO-WHEELER", -4_100, "EMI"));
            ledger.add(new LedgerEntry(day(monthAnchor, 9), "ECHS/RENT SHARE TRANSFER", -11_000, "RENT"));
            ledger.add(new LedgerEntry(day(monthAnchor, 11), "CREDIT CARD BILL PAYMENT HDFC",
                    -(6_000 + rng.nextInt(4_000)), "CARD"));
            ledger.add(new LedgerEntry(day(monthAnchor, 14), "SWIGGY ORDER", -(1_200 + rng.nextInt(1_800)), "FOOD"));
            ledger.add(new LedgerEntry(day(monthAnchor, 20), "AMAZON ORDER", -(2_000 + rng.nextInt(3_500)), "SHOPPING"));
            ledger.add(new LedgerEntry(day(monthAnchor, 24), "MYNTRA SALE PURCHASE", -(1_500 + rng.nextInt(2_500)), "SHOPPING"));
        }
        // One failed mandate (description feeds the extractor's returned-payment rule)
        ledger.add(new LedgerEntry(LocalDate.now().minusMonths(2).withDayOfMonth(5),
                "NACH/ECS RETURN-DISHONOUR INSUFFICIENT FUNDS", 0, "RETURN"));
        ledger.add(new LedgerEntry(LocalDate.now().minusMonths(2).withDayOfMonth(5),
                "NACH DEBIT RETURN CHARGES", -350, "FEES"));
        return toRecords(ledger, 6_500);
    }

    /**
     * Scenario C: applicant will declare a high income; actual salary is materially lower,
     * plus gambling, large round UPI transfers and rapid post-salary ATM cash-out.
     */
    private List<TransactionRecord> suspiciousInconsistency(double declaredAnnualIncome) {
        // Actual salary deliberately ~40% below what the applicant declares
        double realSalary = declaredAnnualIncome > 0 ? declaredAnnualIncome / 12.0 * 0.58 : 46_500;
        realSalary = Math.round(realSalary / 50.0) * 50;
        Random rng = new Random(33);
        List<LedgerEntry> ledger = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int m = MONTHS_OF_HISTORY; m >= 1; m--) {
            LocalDate monthAnchor = today.minusMonths(m);
            ledger.add(new LedgerEntry(day(monthAnchor, 1), "SALARY NOVA RETAIL SERVICES",
                    realSalary + rng.nextInt(300) - 150, "SALARY"));
            // Rapid cash-out right after salary
            ledger.add(new LedgerEntry(day(monthAnchor, 2), "ATM CASH WITHDRAWAL",
                    -Math.round(realSalary * 0.45 / 100) * 100, "CASH"));
            // Gambling pattern
            ledger.add(new LedgerEntry(day(monthAnchor, 9), "RUMMY CIRCLE GAME WALLET LOAD",
                    -(5_000 + rng.nextInt(6_000)), "GAMBLING"));
            // Large round-figure transfers to personal accounts
            ledger.add(new LedgerEntry(day(monthAnchor, 12), "UPI/P2P TRANSFER TO SURESH-K",
                    -30_000, "TRANSFER"));
            if (m % 2 == 0) {
                ledger.add(new LedgerEntry(day(monthAnchor, 13), "UPI/P2P TRANSFER TO SURESH-K",
                        -30_000, "TRANSFER"));
            }
            ledger.add(new LedgerEntry(day(monthAnchor, 16), "BLINKIT GROCERY", -(1_100 + rng.nextInt(900)), "GROCERIES"));
            ledger.add(new LedgerEntry(day(monthAnchor, 21), "RENT UPI TRANSFER", -14_000, "RENT"));
        }
        // Burst of identical same-day transfers
        LocalDate burstDay = LocalDate.now().minusMonths(1).withDayOfMonth(18);
        ledger.add(new LedgerEntry(burstDay, "UPI/P2P TRANSFER TO VENDOR-A", -19_500, "TRANSFER"));
        ledger.add(new LedgerEntry(burstDay, "UPI/P2P TRANSFER TO VENDOR-B", -19_500, "TRANSFER"));
        ledger.add(new LedgerEntry(burstDay, "UPI/P2P TRANSFER TO VENDOR-C", -19_500, "TRANSFER"));
        return toRecords(ledger, 30_000);
    }

    private LocalDate day(LocalDate monthAnchor, int dom) {
        return monthAnchor.withDayOfMonth(Math.min(dom, monthAnchor.lengthOfMonth()));
    }

    /** Plays the ledger through a simulated account so every record carries a running balance. */
    private List<TransactionRecord> toRecords(List<LedgerEntry> ledger, double openingBalance) {
        ledger.sort((a, b) -> a.date.compareTo(b.date));
        List<TransactionRecord> out = new ArrayList<>();
        double balance = openingBalance;
        for (LedgerEntry e : ledger) {
            balance += e.amount;
            out.add(new TransactionRecord(e.date, e.description, e.amount, e.category, Math.round(balance * 100) / 100.0));
        }
        return out;
    }

    public Map<String, Object> describe() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("personas", personas());
        d.put("monthsOfHistory", MONTHS_OF_HISTORY);
        d.put("note", "Deterministic seeded generator; identical output across restarts.");
        return d;
    }

    /** Internal mutable staging entry before balances are applied. */
    private static final class LedgerEntry {
        final LocalDate date;
        final String description;
        final double amount;
        final String category;

        LedgerEntry(LocalDate date, String description, double amount, String category) {
            this.date = date;
            this.description = description;
            this.amount = amount;
            this.category = category;
        }
    }
}
