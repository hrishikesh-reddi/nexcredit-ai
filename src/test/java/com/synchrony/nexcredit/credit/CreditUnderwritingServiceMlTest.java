package com.synchrony.nexcredit.credit;

import com.synchrony.nexcredit.ai.AiProperties;
import com.synchrony.nexcredit.ai.MlRiskModel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CreditUnderwritingServiceMlTest {

    private CreditUnderwritingService mlService() {
        AiProperties props = mock(AiProperties.class);
        when(props.isMlEnabled()).thenReturn(true);
        MlRiskModel mlRiskModel = new MlRiskModel(props);
        mlRiskModel.train();
        CreditApplicationRepository applications = mock(CreditApplicationRepository.class);
        AuditLogRepository auditLogs = mock(AuditLogRepository.class);
        return new CreditUnderwritingService(applications, new AuditLogService(auditLogs), mlRiskModel);
    }

    @Test
    void approves_strong_profile_with_ml() {
        CreditApplication app = new CreditApplication();
        app.setAge(30);
        app.setAnnualIncome(BigDecimal.valueOf(600000));
        app.setEmploymentType(EmploymentType.SALARIED);
        app.setRequestedAmount(BigDecimal.valueOf(150000));
        app.setRequestedEmi(BigDecimal.valueOf(6000));
        app.setEmploymentYears(8);
        app.setEducationLevel("HIGHER");
        app.setMobileUsageScore(88);
        app.setTransactionBehaviorScore(82);
        app.setSocialSignalScore(70);

        CreditDecision decision = mlService().evaluate(app);

        assertThat(decision.isMlPowered()).isTrue();
        assertThat(decision.getCreditDecision()).isEqualTo("APPROVED");
        assertThat(decision.getModelContributions()).isNotEmpty();
    }

    @Test
    void rejects_weak_profile_with_ml() {
        CreditApplication app = new CreditApplication();
        app.setAge(40);
        app.setAnnualIncome(BigDecimal.valueOf(60000));
        app.setEmploymentType(EmploymentType.STUDENT);
        app.setRequestedAmount(BigDecimal.valueOf(200000));
        app.setRequestedEmi(BigDecimal.valueOf(8000));
        app.setDependentsCount(3);
        app.setEmploymentYears(0);
        app.setEducationLevel("LOWER_SECONDARY");
        app.setMobileUsageScore(8);
        app.setTransactionBehaviorScore(10);
        app.setSocialSignalScore(12);

        CreditDecision decision = mlService().evaluate(app);

        assertThat(decision.isMlPowered()).isTrue();
        assertThat(decision.getCreditDecision()).isEqualTo("REJECTED");
    }
}
