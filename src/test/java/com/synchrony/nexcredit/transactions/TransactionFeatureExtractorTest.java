package com.synchrony.nexcredit.transactions;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionFeatureExtractorTest {

    private final TransactionFeatureExtractor extractor = new TransactionFeatureExtractor();

    @Test
    void detects_recurring_salary_and_regularity() {
        List<TransactionRecord> txns = new ArrayList<>();
        LocalDate start = LocalDate.now().minusMonths(6);
        for (int m = 0; m < 6; m++) {
            LocalDate month = start.plusMonths(m);
            txns.add(new TransactionRecord(month.withDayOfMonth(1), "ACME SALARY", 50_000, "SALARY"));
            txns.add(new TransactionRecord(month.withDayOfMonth(5), "RENT TRANSFER TO LANDLORD", -15_000, "RENT"));
            txns.add(new TransactionRecord(month.withDayOfMonth(9), "GROCERY STORE", -3_000, "GROCERIES"));
        }
        CashflowFeatures f = extractor.extract(txns);

        assertThat(f.isSalaryDetected()).isTrue();
        assertThat(f.getMonthlyIncomeDetected()).isEqualTo(50_000.0);
        assertThat(f.getSalaryRegularityPct()).isEqualTo(100);
        assertThat(f.getMonthlySurplus()).isEqualTo(32_000);
        assertThat(f.getSuspiciousTxnCount()).isZero();
        assertThat(f.getMonthsObserved()).isEqualTo(6);
    }

    @Test
    void irregular_income_scores_low_regularity() {
        List<TransactionRecord> txns = new ArrayList<>();
        LocalDate start = LocalDate.now().minusMonths(6);
        double[] amounts = {32_000, 6_000, 28_000, 9_000, 36_000, 5_000};
        for (int m = 0; m < 6; m++) {
            txns.add(new TransactionRecord(start.plusMonths(m).withDayOfMonth(4),
                    "FREELANCE PROJECT CREDIT-UPWORK", amounts[m], "INCOME"));
            txns.add(new TransactionRecord(start.plusMonths(m).withDayOfMonth(6), "EMI LOAN", -9_800, "EMI"));
            txns.add(new TransactionRecord(start.plusMonths(m).withDayOfMonth(7), "RENT TRANSFER TO LANDLORD", -16_000, "RENT"));
        }
        CashflowFeatures f = extractor.extract(txns);

        assertThat(f.isSalaryDetected()).isFalse();
        assertThat(f.getSalaryRegularityPct()).isZero();
        // Fixed obligations exceed lumpy inflows -> structural deficit
        assertThat(f.getMonthlySurplus()).isNegative();
        assertThat(f.getRecurringObligationsCount()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void flags_gambling_round_transfers_and_cash_out() {
        List<TransactionRecord> txns = new ArrayList<>();
        LocalDate month = LocalDate.now().minusMonths(1);
        txns.add(new TransactionRecord(month.withDayOfMonth(1), "SALARY NOVA RETAIL", 46_500, "SALARY"));
        txns.add(new TransactionRecord(month.withDayOfMonth(2), "ATM CASH WITHDRAWAL", -25_000, "CASH"));
        txns.add(new TransactionRecord(month.withDayOfMonth(9), "RUMMY CIRCLE GAME WALLET LOAD", -8_000, "GAMBLING"));
        txns.add(new TransactionRecord(month.withDayOfMonth(12), "UPI/P2P TRANSFER TO SURESH-K", -30_000, "TRANSFER"));
        CashflowFeatures f = extractor.extract(txns);

        assertThat(f.getSuspiciousTxnCount()).isGreaterThanOrEqualTo(3);
        assertThat(f.getSuspiciousFindings()).anyMatch(s -> s.toLowerCase().contains("gambling"));
        assertThat(f.getSuspiciousFindings()).anyMatch(s -> s.contains("round-figure"));
        assertThat(f.getSuspiciousFindings()).anyMatch(s -> s.contains("Cash-out"));
    }

    @Test
    void counts_returned_payments_and_low_balance_months() {
        List<TransactionRecord> txns = new ArrayList<>();
        LocalDate start = LocalDate.now().minusMonths(3);
        // Month 1: healthy, comfortable balance
        txns.add(new TransactionRecord(start.withDayOfMonth(1), "SALARY X", 30_000, "SALARY", 45_000.0));
        txns.add(new TransactionRecord(start.withDayOfMonth(20), "RENT TRANSFER TO LANDLORD", -10_000, "RENT", 35_000.0));
        // Months 2-3: near-zero balances and a failed mandate each month
        for (int m = 1; m <= 2; m++) {
            LocalDate month = start.plusMonths(m);
            txns.add(new TransactionRecord(month.withDayOfMonth(1), "SALARY X", 30_000, "SALARY", 2_400.0));
            txns.add(new TransactionRecord(month.withDayOfMonth(5),
                    "NACH/ECS RETURN-DISHONOUR INSUFFICIENT FUNDS", 0, "RETURN", 2_300.0));
            txns.add(new TransactionRecord(month.withDayOfMonth(6), "UPI/P2P TRANSFER OUT", -2_000, "TRANSFER", 300.0));
        }
        CashflowFeatures f = extractor.extract(txns);

        assertThat(f.getReturnedPayments()).isEqualTo(2);
        assertThat(f.getLowBalanceMonths()).isGreaterThanOrEqualTo(2);
        assertThat(f.getLowBalanceDays()).isGreaterThanOrEqualTo(4);
    }

    @Test
    void declared_income_divergence_is_reported() {
        List<TransactionRecord> txns = new ArrayList<>();
        LocalDate start = LocalDate.now().minusMonths(4);
        for (int m = 0; m < 4; m++) {
            txns.add(new TransactionRecord(start.plusMonths(m).withDayOfMonth(1), "SALARY Y", 46_000, "SALARY"));
        }
        CashflowFeatures f = extractor.extract(txns, BigDecimal.valueOf(1_200_000));

        assertThat(f.isSalaryDetected()).isTrue();
        assertThat(f.getSuspiciousFindings()).anyMatch(s -> s.contains("diverges"));
    }

    @Test
    void empty_stream_yields_zeroed_features() {
        CashflowFeatures f = extractor.extract(List.of());
        assertThat(f.getTransactionCount()).isZero();
        assertThat(f.isSalaryDetected()).isFalse();
    }
}
