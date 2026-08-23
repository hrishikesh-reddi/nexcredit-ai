package com.synchrony.nexcredit.credit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.sql.Timestamp;

@Entity
@Table(name = "document_evidence")
public class DocumentEvidence {
    @Id
    @SequenceGenerator(name = "document_evidence_sequence", sequenceName = "document_evidence_sequence", allocationSize = 1)
    @GeneratedValue(generator = "document_evidence_sequence", strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(nullable = false)
    private Long applicationId;

    @Column(nullable = false, length = 500)
    private String originalFileName;

    @Column(nullable = false, length = 40)
    private String extractionStatus;

    @Column(length = 4000)
    private String textPreview;

    @Column
    private BigDecimal extractedAnnualIncome;

    @Column(nullable = false, updatable = false)
    private Timestamp createdAt;

    public DocumentEvidence() { }

    public DocumentEvidence(Long applicationId, String originalFileName, String extractionStatus, String textPreview) {
        this.applicationId = applicationId;
        this.originalFileName = originalFileName;
        this.extractionStatus = extractionStatus;
        this.textPreview = textPreview;
    }

    @PrePersist
    void setCreatedAtIfAbsent() {
        if (createdAt == null) {
            createdAt = new Timestamp(System.currentTimeMillis());
        }
    }

    public Long getId() { return id; }
    public Long getApplicationId() { return applicationId; }
    public String getOriginalFileName() { return originalFileName; }
    public String getExtractionStatus() { return extractionStatus; }
    public String getTextPreview() { return textPreview; }
    public BigDecimal getExtractedAnnualIncome() { return extractedAnnualIncome; }
    public void setExtractedAnnualIncome(BigDecimal extractedAnnualIncome) { this.extractedAnnualIncome = extractedAnnualIncome; }
    public Timestamp getCreatedAt() { return createdAt; }
}
