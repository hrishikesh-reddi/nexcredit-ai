package com.synchrony.nexcredit.credit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.synchrony.nexcredit.ai.ExplanationService;
import com.synchrony.nexcredit.ai.VectorStore;
import com.synchrony.nexcredit.security.AuthController;
import com.synchrony.nexcredit.security.JwtAuthenticationFilter;
import com.synchrony.nexcredit.security.JwtUtil;
import com.synchrony.nexcredit.security.SecurityConfig;
import com.synchrony.nexcredit.security.UsersConfig;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {CreditController.class, AuditController.class},
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, UsersConfig.class, AuthController.class, JwtUtil.class, JwtAuthenticationFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class CreditControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CreditApplicationService applicationService;

    @MockBean
    private CreditUnderwritingService underwritingService;

    @MockBean
    private DocumentEvidenceService documentEvidenceService;

    @MockBean
    private VectorStore vectorStore;

    @MockBean
    private ExplanationService explanationService;

    @MockBean
    private com.synchrony.nexcredit.ai.CopilotService copilotService;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private com.synchrony.nexcredit.transactions.TransactionIngestionService transactionIngestionService;

    @MockBean
    private com.synchrony.nexcredit.integration.IntegrationsService integrationsService;

    @Test
    void analyzes_a_credit_application_at_the_requested_endpoint() throws Exception {
        CreditDecision decision = new CreditDecision("APPROVED", 85, "Strong alternative data profile", "LOW");
        decision.setApplicationId(42L);
        given(underwritingService.analyze(any(CreditApplication.class))).willReturn(decision);

        mockMvc.perform(post("/api/credit/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"applicantName\":\"Asha Rao\",\"age\":28,\"annualIncome\":750000,\"employmentType\":\"SALARIED\",\"mobileUsageScore\":80,\"transactionBehaviorScore\":75,\"socialSignalScore\":60}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creditDecision").value("APPROVED"))
                .andExpect(jsonPath("$.confidenceScore").value(85))
                .andExpect(jsonPath("$.fraudRisk").value("LOW"))
                .andExpect(jsonPath("$.applicationId").isNumber());
    }

    @Test
    void returns_audit_logs_for_compliance_review() throws Exception {
        given(auditLogService.getAllLogs())
                .willReturn(java.util.List.of(new AuditLog(7L, "APPROVED", "Strong alternative data profile")));

        mockMvc.perform(get("/api/audit/logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].applicationId").value(7))
                .andExpect(jsonPath("$[0].decision").value("APPROVED"));
    }

    @Test
    void returns_audit_history_for_one_application() throws Exception {
        given(auditLogService.getLogsForApplication(7L))
                .willReturn(java.util.List.of(new AuditLog(7L, "APPROVED", "Strong alternative data profile")));

        mockMvc.perform(get("/api/audit/logs/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].applicationId").value(7));
    }

    @Test
    void returns_only_applications_waiting_for_human_review() throws Exception {
        CreditApplication application = new CreditApplication();
        application.setApplicantName("Amit Patel");
        application.setReviewStatus(ReviewStatus.PENDING_REVIEW);
        given(applicationService.getPendingReviewApplications()).willReturn(java.util.List.of(application));

        mockMvc.perform(get("/api/credit/pending-review"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].applicantName").value("Amit Patel"))
                .andExpect(jsonPath("$[0].reviewStatus").value("PENDING_REVIEW"));
    }

    @Test
    void records_a_reviewer_final_decision_and_notes() throws Exception {
        CreditApplication application = new CreditApplication();
        application.setId(9L);
        application.setCreditDecision("APPROVED");
        application.setReviewStatus(ReviewStatus.REVIEWED);
        application.setReviewerNotes("Income proof verified by analyst");
        given(applicationService.review(9L, "APPROVED", "Income proof verified by analyst"))
                .willReturn(application);

        mockMvc.perform(post("/api/credit/review/9")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVED\",\"reviewerNotes\":\"Income proof verified by analyst\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.creditDecision").value("APPROVED"))
                .andExpect(jsonPath("$.reviewStatus").value("REVIEWED"))
                .andExpect(jsonPath("$.reviewerNotes").value("Income proof verified by analyst"));
    }

    @Test
    void stores_an_uploaded_supporting_document_for_an_application() throws Exception {
        given(applicationService.storeDocument(org.mockito.ArgumentMatchers.eq(11L), org.mockito.ArgumentMatchers.any(org.springframework.web.multipart.MultipartFile.class)))
                .willReturn("uploads/11-income-proof.pdf");
        given(documentEvidenceService.extractAndStore(org.mockito.ArgumentMatchers.eq(11L),
                org.mockito.ArgumentMatchers.eq("uploads/11-income-proof.pdf"),
                org.mockito.ArgumentMatchers.eq("income-proof.pdf")))
                .willReturn(new DocumentEvidence(11L, "income-proof.pdf", "EXTRACTED", "Annual income: 300000"));

        mockMvc.perform(multipart("/api/credit/upload")
                        .file(new org.springframework.mock.web.MockMultipartFile(
                                "file", "income-proof.pdf", "application/pdf", "sample".getBytes()))
                        .param("applicationId", "11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentPath").value("uploads/11-income-proof.pdf"))
                .andExpect(jsonPath("$.extractionStatus").value("EXTRACTED"))
                .andExpect(jsonPath("$.textPreview").value("Annual income: 300000"));
    }
}
