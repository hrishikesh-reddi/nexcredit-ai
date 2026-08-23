package com.synchrony.nexcredit.credit;

import com.synchrony.nexcredit.ai.MlRiskModel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CreditUnderwritingServiceTest {

    @Test
    void approves_an_application_with_a_strong_alternative_data_profile() {
        CreditApplication application = new CreditApplication();
        application.setAge(28);
        application.setAnnualIncome(BigDecimal.valueOf(500000));
        application.setEmploymentType(EmploymentType.SALARIED);
        application.setMobileUsageScore(80);
        application.setTransactionBehaviorScore(75);
        application.setSocialSignalScore(60);

        CreditApplicationRepository applications = org.mockito.Mockito.mock(CreditApplicationRepository.class);
        AuditLogService auditLogService = org.mockito.Mockito.mock(AuditLogService.class);
        org.mockito.Mockito.when(applications.save(org.mockito.ArgumentMatchers.any(CreditApplication.class)))
                .thenAnswer(invocation -> {
                    CreditApplication saved = invocation.getArgument(0);
                    saved.setId(42L);
                    return saved;
                });
        MlRiskModel mlRiskModel = mock(MlRiskModel.class);
        when(mlRiskModel.isAvailable()).thenReturn(false);
        CreditDecision decision = new CreditUnderwritingService(applications, auditLogService, mlRiskModel).analyze(application);

        assertThat(decision.getCreditDecision()).isEqualTo("APPROVED");
        assertThat(decision.getConfidenceScore()).isEqualTo(88);
        assertThat(decision.getFraudRisk()).isEqualTo("LOW");
        assertThat(decision.getApplicationId()).isEqualTo(42L);
        org.mockito.Mockito.verify(auditLogService).record(application, decision);
    }
}
