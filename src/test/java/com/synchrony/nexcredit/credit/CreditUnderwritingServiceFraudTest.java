package com.synchrony.nexcredit.credit;

import com.synchrony.nexcredit.ai.AiProperties;
import com.synchrony.nexcredit.ai.MlRiskModel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CreditUnderwritingServiceFraudTest {

    private CreditUnderwritingService ruleBasedService() {
        MlRiskModel mlRiskModel = mock(MlRiskModel.class);
        when(mlRiskModel.isAvailable()).thenReturn(false);
        CreditApplicationRepository applications = mock(CreditApplicationRepository.class);
        DocumentEvidenceRepository evidenceRepository = mock(DocumentEvidenceRepository.class);
        return new CreditUnderwritingService(applications, new AuditLogService(mock(AuditLogRepository.class)), mlRiskModel, evidenceRepository);
    }

    @Test
    void incoherent_input_triggers_high_fraud_risk() {
        CreditApplication app = new CreditApplication();
        app.setAge(30);
        app.setAnnualIncome(BigDecimal.valueOf(2_000_000));
        app.setEmploymentType(EmploymentType.STUDENT);
        app.setMobileUsageScore(10);
        app.setTransactionBehaviorScore(10);
        app.setSocialSignalScore(10);

        CreditDecision decision = ruleBasedService().evaluate(app);

        assertThat(decision.getFraudSubSignals()).isNotEmpty();
        assertThat(decision.getFraudSubSignals()).containsEntry("signalIncomeSignalMismatch", 1.0);
        assertThat(decision.getFraudRisk()).isEqualTo("HIGH");
        assertThat(decision.getModelVersion()).isEqualTo("deterministic-rules-v1");
        assertThat(decision.getDataProvenance()).isEqualTo("policy-rules");
    }

    @Test
    void document_income_divergence_sets_sub_signal() {
        CreditApplication app = new CreditApplication();
        app.setId(99L);
        app.setAge(30);
        app.setAnnualIncome(BigDecimal.valueOf(1_000_000));
        app.setEmploymentType(EmploymentType.SALARIED);
        app.setMobileUsageScore(80);
        app.setTransactionBehaviorScore(75);
        app.setSocialSignalScore(60);

        DocumentEvidence evidence = new DocumentEvidence();
        evidence.setExtractedAnnualIncome(BigDecimal.valueOf(1_500_000));

        DocumentEvidenceRepository evidenceRepository = mock(DocumentEvidenceRepository.class);
        when(evidenceRepository.findTopByApplicationIdOrderByCreatedAtDesc(99L)).thenReturn(Optional.of(evidence));

        MlRiskModel mlRiskModel = mock(MlRiskModel.class);
        when(mlRiskModel.isAvailable()).thenReturn(false);
        CreditUnderwritingService service = new CreditUnderwritingService(
                mock(CreditApplicationRepository.class),
                new AuditLogService(mock(AuditLogRepository.class)),
                mlRiskModel,
                evidenceRepository);

        CreditDecision decision = service.evaluate(app);

        assertThat(decision.getFraudSubSignals()).containsEntry("signalDocIncomeDivergence", 1.0);
        assertThat(decision.getFraudRisk()).isEqualTo("HIGH");
    }
}
