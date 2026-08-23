package com.synchrony.nexcredit.credit;

import com.synchrony.nexcredit.ai.CopilotService;
import com.synchrony.nexcredit.ai.ExplanationResponse;
import com.synchrony.nexcredit.ai.ExplanationService;
import com.synchrony.nexcredit.ai.MlRiskModel;
import com.synchrony.nexcredit.ai.VectorStore;
import com.synchrony.nexcredit.integration.IntegrationsService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CreditControllerExplanationTest {

    @Test
    void generates_an_explanation_without_persisting_an_application_or_audit_event() {
        CreditApplicationRepository applications = mock(CreditApplicationRepository.class);
        AuditLogService auditLogService = mock(AuditLogService.class);
        when(applications.save(any(CreditApplication.class))).thenAnswer(invocation -> {
            CreditApplication saved = invocation.getArgument(0);
            saved.setId(99L);
            return saved;
        });
        MlRiskModel mlRiskModel = mock(MlRiskModel.class);
        when(mlRiskModel.isAvailable()).thenReturn(false);
        CreditUnderwritingService underwritingService = new CreditUnderwritingService(applications, auditLogService, mlRiskModel);
        ExplanationService explanationService = mock(ExplanationService.class);
        when(explanationService.explain(any(CreditApplication.class), any(CreditDecision.class)))
                .thenReturn(new ExplanationResponse("Transparent rationale", false, "Reviewer support only"));

        CreditController controller = new CreditController(
                mock(CreditApplicationService.class),
                underwritingService,
                mock(DocumentEvidenceService.class),
                mock(VectorStore.class),
                explanationService,
                mock(CopilotService.class),
                new com.synchrony.nexcredit.transactions.TransactionIngestionService(
                        mock(CreditApplicationRepository.class),
                        underwritingService,
                        new com.synchrony.nexcredit.transactions.TransactionFeatureExtractor(),
                        new com.synchrony.nexcredit.integration.LocalPersonaProvider(),
                        mock(com.synchrony.nexcredit.integration.PlaidSandboxProvider.class)),
                mock(IntegrationsService.class));

        CreditApplication application = strongApplication();
        ExplanationResponse response = controller.explanation(application);

        assertThat(response.explanation()).isEqualTo("Transparent rationale");
        verify(applications, never()).save(any(CreditApplication.class));
        verify(auditLogService, never()).record(any(CreditApplication.class), any(CreditDecision.class));
    }

    private CreditApplication strongApplication() {
        CreditApplication application = new CreditApplication();
        application.setApplicantName("Asha Rao");
        application.setAge(28);
        application.setAnnualIncome(BigDecimal.valueOf(500000));
        application.setEmploymentType(EmploymentType.SALARIED);
        application.setMobileUsageScore(80);
        application.setTransactionBehaviorScore(75);
        application.setSocialSignalScore(60);
        return application;
    }
}
