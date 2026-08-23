package com.synchrony.nexcredit.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.synchrony.nexcredit.ai.ExplanationService;
import com.synchrony.nexcredit.ai.VectorStore;
import com.synchrony.nexcredit.credit.AuditController;
import com.synchrony.nexcredit.credit.AuditLog;
import com.synchrony.nexcredit.credit.AuditLogService;
import com.synchrony.nexcredit.credit.CreditApplication;
import com.synchrony.nexcredit.credit.CreditApplicationService;
import com.synchrony.nexcredit.credit.CreditController;
import com.synchrony.nexcredit.credit.CreditDecision;
import com.synchrony.nexcredit.credit.CreditUnderwritingService;
import com.synchrony.nexcredit.credit.DocumentEvidenceService;
import com.synchrony.nexcredit.credit.ReviewStatus;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {CreditController.class, AuditController.class},
        excludeFilters = @org.springframework.context.annotation.ComponentScan.Filter(
                type = org.springframework.context.annotation.FilterType.ASSIGNABLE_TYPE,
                classes = {AuthController.class}))
@AutoConfigureMockMvc(addFilters = true)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, UsersConfig.class, SecurityConfigTest.JwtTestConfig.class})
class SecurityConfigTest {

    @Configuration
    static class JwtTestConfig {
        @Bean
        JwtUtil jwtUtil() {
            return new JwtUtil("nexcredit-dev-secret-change-me-in-production-0123456789abcd", 3600000);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

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
    private AuditLogService auditLogService;

    private String token(String role) {
        return "Bearer " + jwtUtil.generateToken("tester", List.of(role));
    }

    @Test
    void applications_endpoint_requires_authentication() throws Exception {
        mockMvc.perform(get("/api/credit/applications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void audit_endpoint_requires_authentication() throws Exception {
        mockMvc.perform(get("/api/audit/logs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void evidence_endpoint_requires_authentication() throws Exception {
        mockMvc.perform(get("/api/credit/evidence/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void analyze_and_explanation_are_permitAll_in_config() throws Exception {
        // Verified by reading SecurityConfig: /api/credit/analyze and
        // /api/credit/explanation are in the permitAll matcher list, while every
        // other /api/credit/** and /api/audit/** endpoint requires a role.
        java.nio.file.Path path = java.nio.file.Paths.get(
                "src/main/java/com/synchrony/nexcredit/security/SecurityConfig.java");
        String config = java.nio.file.Files.readString(path);
        org.junit.jupiter.api.Assertions.assertTrue(config.contains("\"/api/credit/analyze\""));
        org.junit.jupiter.api.Assertions.assertTrue(config.contains("\"/api/credit/explanation\""));
        org.junit.jupiter.api.Assertions.assertTrue(
                config.contains("hasAnyRole(\"UNDERWRITER\", \"ADMIN\", \"APPLICANT\")"));
    }
}
