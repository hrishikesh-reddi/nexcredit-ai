package com.synchrony.nexcredit.credit;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class CreditApplicationService {
    private static final long MAX_DOCUMENT_SIZE_BYTES = 10L * 1024 * 1024;
    private final CreditApplicationRepository repository;
    private final AuditLogService auditLogService;
    private final CreditUnderwritingService underwritingService;

    public CreditApplicationService(CreditApplicationRepository repository,
                                    AuditLogService auditLogService,
                                    CreditUnderwritingService underwritingService) {
        this.repository = repository;
        this.auditLogService = auditLogService;
        this.underwritingService = underwritingService;
    }

    public List<CreditApplication> getAllApplications() {
        return repository.findAll();
    }

    public CreditApplication save(CreditApplication application) {
        CreditDecision decision = underwritingService.analyze(application);
        application.setCreditDecision(decision.getCreditDecision());
        application.setConfidenceScore(decision.getConfidenceScore());
        application.setReasoning(decision.getReasoning());
        application.setFraudRisk(decision.getFraudRisk());
        if (application.getReviewStatus() == null) {
            applyReviewStatus(application);
        }
        return repository.save(application);
    }

    public List<CreditApplication> getPendingReviewApplications() {
        return repository.findByReviewStatus(ReviewStatus.PENDING_REVIEW);
    }

    public CreditApplication getById(Long applicationId) {
        return repository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Credit application not found"));
    }

    public CreditApplication review(Long applicationId, String decision, String reviewerNotes) {
        CreditApplication application = repository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Credit application not found"));
        if (!"APPROVED".equals(decision) && !"REJECTED".equals(decision) && !"PENDING".equals(decision)) {
            throw new IllegalArgumentException("Reviewer decision must be APPROVED, REJECTED, or PENDING");
        }
        application.setCreditDecision(decision);
        application.setReviewStatus(ReviewStatus.REVIEWED);
        application.setReviewerNotes(reviewerNotes);
        CreditApplication savedApplication = repository.save(application);
        auditLogService.record(savedApplication, new CreditDecision(
                decision,
                savedApplication.getConfidenceScore() == null ? 0 : savedApplication.getConfidenceScore(),
                "Human review completed: " + (reviewerNotes == null ? "No notes provided." : reviewerNotes),
                savedApplication.getFraudRisk()));
        return savedApplication;
    }

    public String storeDocument(Long applicationId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("A document file is required");
        }
        if (file.getSize() > MAX_DOCUMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Supporting documents must not exceed 10 MB");
        }
        CreditApplication application = repository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Credit application not found"));
        String originalName = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path uploadsDirectory = Path.of("uploads").toAbsolutePath().normalize();
        Path destination = uploadsDirectory.resolve(applicationId + "-" + UUID.randomUUID() + "-" + safeName);
        try {
            Files.createDirectories(uploadsDirectory);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to save document", exception);
        }
        application.setDocumentPath("uploads/" + destination.getFileName());
        repository.save(application);
        return application.getDocumentPath();
    }

    private void applyReviewStatus(CreditApplication application) {
        boolean requiresReview = (application.getConfidenceScore() != null && application.getConfidenceScore() < 70)
                || "HIGH".equals(application.getFraudRisk())
                || (application.getAge() != null && application.getAge() < 21
                && "REJECTED".equals(application.getCreditDecision()));
        if (requiresReview) {
            application.setReviewStatus(ReviewStatus.PENDING_REVIEW);
        } else if ("APPROVED".equals(application.getCreditDecision())) {
            application.setReviewStatus(ReviewStatus.AUTO_APPROVED);
        } else if ("REJECTED".equals(application.getCreditDecision())) {
            application.setReviewStatus(ReviewStatus.AUTO_REJECTED);
        } else {
            application.setReviewStatus(ReviewStatus.REVIEWED);
        }
    }
}
