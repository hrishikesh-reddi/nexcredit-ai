package com.synchrony.nexcredit.credit;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.synchrony.nexcredit.ai.EvidenceSearchRequest;
import com.synchrony.nexcredit.ai.CopilotRequest;
import com.synchrony.nexcredit.ai.CopilotResponse;
import com.synchrony.nexcredit.ai.CopilotService;
import com.synchrony.nexcredit.ai.ExplanationResponse;
import com.synchrony.nexcredit.ai.ExplanationService;
import com.synchrony.nexcredit.ai.SearchHit;
import com.synchrony.nexcredit.ai.VectorStore;
import com.synchrony.nexcredit.integration.IntegrationStatus;
import com.synchrony.nexcredit.integration.IntegrationsService;
import com.synchrony.nexcredit.transactions.AdverseEventResult;
import com.synchrony.nexcredit.transactions.IngestionResult;
import com.synchrony.nexcredit.transactions.TransactionIngestionService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/credit")
public class CreditController {
    private final CreditApplicationService applicationService;
    private final CreditUnderwritingService underwritingService;
    private final DocumentEvidenceService documentEvidenceService;
    private final VectorStore vectorStore;
    private final ExplanationService explanationService;
    private final CopilotService copilotService;
    private final TransactionIngestionService transactionIngestionService;
    private final IntegrationsService integrationsService;

    public CreditController(CreditApplicationService applicationService,
                            CreditUnderwritingService underwritingService,
                            DocumentEvidenceService documentEvidenceService,
                            VectorStore vectorStore,
                            ExplanationService explanationService,
                            CopilotService copilotService,
                            TransactionIngestionService transactionIngestionService,
                            IntegrationsService integrationsService) {
        this.applicationService = applicationService;
        this.underwritingService = underwritingService;
        this.documentEvidenceService = documentEvidenceService;
        this.vectorStore = vectorStore;
        this.explanationService = explanationService;
        this.copilotService = copilotService;
        this.transactionIngestionService = transactionIngestionService;
        this.integrationsService = integrationsService;
    }

    @GetMapping("/applications")
    public List<CreditApplication> getAllApplications() {
        return applicationService.getAllApplications();
    }

    @GetMapping("/pending-review")
    public List<CreditApplication> getPendingReviewApplications() {
        return applicationService.getPendingReviewApplications();
    }

    @PostMapping("/applications")
    @ResponseStatus(HttpStatus.CREATED)
    public CreditApplication createApplication(@Valid @RequestBody CreditApplication application) {
        return applicationService.save(application);
    }

    @PostMapping("/analyze")
    public CreditDecision analyze(@Valid @RequestBody CreditApplication application) {
        return underwritingService.analyze(application);
    }

    @PostMapping("/applications/{applicationId}/reanalyze")
    public CreditDecision reanalyze(@PathVariable Long applicationId) {
        return underwritingService.reanalyzeExisting(applicationId);
    }

    @PostMapping("/review/{applicationId}")
    public CreditApplication reviewApplication(@PathVariable Long applicationId,
                                                @RequestBody(required = false) ReviewRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("A reviewer decision is required");
        }
        return applicationService.review(applicationId, request.getDecision(), request.getReviewerNotes());
    }

    @PostMapping("/upload")
    public Map<String, String> uploadDocument(
            @RequestParam Long applicationId,
            @RequestParam("file") MultipartFile file) {
        String documentPath = applicationService.storeDocument(applicationId, file);
        String originalName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        DocumentEvidence evidence = documentEvidenceService.extractAndStore(applicationId, documentPath, originalName);
        Map<String, String> response = new LinkedHashMap<>();
        response.put("documentPath", documentPath);
        response.put("extractionStatus", evidence.getExtractionStatus());
        response.put("textPreview", evidence.getTextPreview() == null ? "" : evidence.getTextPreview());
        return response;
    }

    @GetMapping("/evidence/{applicationId}")
    public DocumentEvidence getLatestDocumentEvidence(@PathVariable Long applicationId) {
        return documentEvidenceService.getLatestEvidence(applicationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No document evidence found"));
    }

    @PostMapping("/evidence/search")
    public Map<String, Object> searchEvidence(@Valid @RequestBody EvidenceSearchRequest request) {
        int k = request.k() == null || request.k() < 1 ? 5 : Math.min(request.k(), 25);
        List<SearchHit> hits = vectorStore.search(request.query() == null ? "" : request.query(), k);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("semanticSearchAvailable", vectorStore.isAvailable());
        response.put("results", hits);
        return response;
    }

    @PostMapping("/explanation")
    public ExplanationResponse explanation(@Valid @RequestBody CreditApplication application) {
        CreditDecision decision = underwritingService.evaluate(application);
        return explanationService.explain(application, decision);
    }

    @PostMapping("/simulate")
    public CreditDecision simulate(@Valid @RequestBody CreditApplication application) {
        return underwritingService.simulate(application);
    }

    @GetMapping("/model")
    public Map<String, Object> modelCard() {
        return underwritingService.modelCard();
    }

    @GetMapping("/model/metrics")
    public Map<String, Object> modelMetrics() {
        return underwritingService.modelMetrics();
    }

    @GetMapping("/model/benchmark")
    public Map<String, Object> modelBenchmark() {
        return underwritingService.benchmark();
    }

    @PostMapping("/copilot")
    public CopilotResponse copilot(@Valid @RequestBody CopilotRequest request) {
        if (request.applicationId() == null) {
            throw new IllegalArgumentException("An applicationId is required");
        }
        return copilotService.answer(request.applicationId(), request.question());
    }

    /** Pulls a transaction stream (local persona or Plaid sandbox), derives cash-flow features, re-underwrites. */
    @PostMapping("/applications/{applicationId}/transactions/ingest")
    public IngestionResult ingestTransactions(@PathVariable Long applicationId,
                                              @RequestParam(defaultValue = "local") String provider,
                                              @RequestParam(required = false) String persona) {
        return transactionIngestionService.ingest(applicationId, provider, persona);
    }

    /** Live what-if: injects an adverse financial event and recalculates every downstream number. */
    @PostMapping("/applications/{applicationId}/transactions/adverse-event")
    public AdverseEventResult simulateAdverseEvent(@PathVariable Long applicationId,
                                                   @RequestParam String kind) {
        return transactionIngestionService.simulateAdverseEvent(applicationId, kind);
    }

    /** Cash-flow feature overlay (salary regularity, surplus, low-balance days, volatility, savings trend + composite score). */
    @GetMapping("/applications/{applicationId}/cashflow-features")
    public Map<String, Object> cashflowFeatures(@PathVariable Long applicationId) {
        try {
            return transactionIngestionService.getCashflowFeatures(applicationId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/integrations")
    public Map<String, IntegrationStatus> integrations() {
        return integrationsService.getStatus();
    }

    @GetMapping("/applications/{applicationId}/letter")
    public Map<String, Object> decisionLetter(@PathVariable Long applicationId) {
        CreditApplication app = applicationService.getById(applicationId);
        Map<String, Object> letter = new LinkedHashMap<>();
        letter.put("applicantName", app.getApplicantName());
        letter.put("creditDecision", app.getCreditDecision());
        letter.put("confidenceScore", app.getConfidenceScore());
        letter.put("fraudScore", app.getFraudScore());
        letter.put("pricingBand", app.getPricingBand());
        letter.put("recommendedCreditLimit", app.getRecommendedCreditLimit());
        letter.put("decisionRationale", app.getDecisionRationale());
        letter.put("adverseReasonCodes", parseJsonArray(app.getAdverseReasonCodes()));
        letter.put("conditions", parseJsonArray(app.getConditions()));
        letter.put("decisionLatencyMs", app.getDecisionLatencyMs());
        return letter;
    }

    private Object parseJsonArray(String s) {
        if (s == null || s.isBlank()) {
            return new java.util.ArrayList<>();
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(s, List.class);
        } catch (Exception e) {
            return new java.util.ArrayList<>();
        }
    }
}
