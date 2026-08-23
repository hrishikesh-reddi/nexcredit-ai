package com.synchrony.nexcredit.credit;

import com.synchrony.nexcredit.ai.MlRiskModel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CreditUnderwritingBiasGuardrailTest {

    @Test
    void routes_an_age_sensitive_rejection_to_human_review() {
        CreditApplication application = new CreditApplication();
        application.setAge(19);
        application.setAnnualIncome(BigDecimal.valueOf(150000));
        application.setEmploymentType(EmploymentType.STUDENT);
        application.setMobileUsageScore(20);
        application.setTransactionBehaviorScore(50);
        application.setSocialSignalScore(50);

        CreditApplicationRepository applications = org.mockito.Mockito.mock(CreditApplicationRepository.class);
        org.mockito.Mockito.when(applications.save(org.mockito.ArgumentMatchers.any(CreditApplication.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        AuditLogRepository auditLogs = org.mockito.Mockito.mock(AuditLogRepository.class);
        MlRiskModel mlRiskModel = mock(MlRiskModel.class);
        when(mlRiskModel.isAvailable()).thenReturn(false);
        CreditDecision decision = new CreditUnderwritingService(applications, new AuditLogService(auditLogs), mlRiskModel).analyze(application);

        assertThat(decision.getCreditDecision()).isEqualTo("PENDING");
        assertThat(decision.getConfidenceScore()).isEqualTo(60);
        assertThat(decision.getReasoning()).contains("BIAS GUARDRAIL");
    }
}
