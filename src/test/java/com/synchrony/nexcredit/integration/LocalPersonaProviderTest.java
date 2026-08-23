package com.synchrony.nexcredit.integration;

import com.synchrony.nexcredit.transactions.CashflowFeatures;
import com.synchrony.nexcredit.transactions.TransactionFeatureExtractor;
import com.synchrony.nexcredit.transactions.TransactionRecord;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LocalPersonaProviderTest {

    private final LocalPersonaProvider provider = new LocalPersonaProvider();
    private final TransactionFeatureExtractor extractor = new TransactionFeatureExtractor();

    @Test
    void healthy_persona_shows_stable_income_and_clean_record() {
        List<TransactionRecord> txns = provider.fetch(LocalPersonaProvider.HEALTHY_NTC, 550_000);
        CashflowFeatures f = extractor.extract(txns, BigDecimal.valueOf(550_000));

        assertThat(f.getTransactionCount()).isGreaterThan(50);
        assertThat(f.isSalaryDetected()).isTrue();
        assertThat(f.getSalaryRegularityPct()).isGreaterThanOrEqualTo(85);
        assertThat(f.getMonthlySurplus()).isPositive();
        assertThat(f.getLowBalanceMonths()).isZero();
        assertThat(f.getSuspiciousTxnCount()).isZero();
        // Determinism
        assertThat(provider.fetch(LocalPersonaProvider.HEALTHY_NTC, 550_000)).isEqualTo(txns);
    }

    @Test
    void unstable_persona_shows_lumpy_income_and_obligations() {
        List<TransactionRecord> txns = provider.fetch(LocalPersonaProvider.UNSTABLE_OBLIGATIONS, 300_000);
        CashflowFeatures f = extractor.extract(txns, BigDecimal.valueOf(300_000));

        assertThat(f.getReturnedPayments()).isGreaterThanOrEqualTo(1);
        assertThat(f.getRecurringObligationsCount()).isGreaterThanOrEqualTo(2);
        // Fixed obligations exceed lumpy inflows -> structural monthly deficit
        assertThat(f.getMonthlySurplus()).isNegative();
        assertThat(f.getLowBalanceMonths()).isGreaterThanOrEqualTo(4);
    }

    @Test
    void suspicious_persona_triggers_multiple_fraud_findings() {
        double declared = 1_000_000;
        List<TransactionRecord> txns = provider.fetch(LocalPersonaProvider.SUSPICIOUS_INCONSISTENCY, declared);
        CashflowFeatures f = extractor.extract(txns, BigDecimal.valueOf(declared));

        assertThat(f.getSuspiciousTxnCount()).isGreaterThanOrEqualTo(3);
        assertThat(f.getSuspiciousFindings()).anyMatch(s -> s.toLowerCase().contains("gambling"));
        assertThat(f.getSuspiciousFindings()).anyMatch(s -> s.contains("Cash-out"));
        assertThat(f.getSuspiciousFindings()).anyMatch(s -> s.contains("diverges"));
    }

    @Test
    void personas_are_distinct_streams() {
        List<TransactionRecord> healthy = provider.fetch(LocalPersonaProvider.HEALTHY_NTC, 500_000);
        List<TransactionRecord> unstable = provider.fetch(LocalPersonaProvider.UNSTABLE_OBLIGATIONS, 500_000);
        List<TransactionRecord> suspicious = provider.fetch(LocalPersonaProvider.SUSPICIOUS_INCONSISTENCY, 500_000);

        assertThat(healthy).isNotEqualTo(unstable);
        assertThat(unstable).isNotEqualTo(suspicious);
        assertThat(healthy).isNotEqualTo(suspicious);
    }
}
