package com.synchrony.nexcredit.credit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.sql.Timestamp;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @SequenceGenerator(name = "audit_log_sequence", sequenceName = "audit_log_sequence", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "audit_log_sequence")
    private Long id;

    private Long applicationId;
    private String decision;
    @Column(length = 1000)
    private String reasoning;
    @Column
    private String fraudRisk;
    @Column(length = 4000)
    private String modelContributionsJson;
    @Column
    private String modelVersion;
    @Column(nullable = false, updatable = false)
    private Timestamp timestamp;

    public AuditLog() { }

    public AuditLog(Long applicationId, String decision, String reasoning) {
        this.applicationId = applicationId;
        this.decision = decision;
        this.reasoning = reasoning;
    }

    public AuditLog(Long applicationId, String decision, String reasoning, String fraudRisk,
                    String modelContributionsJson, String modelVersion) {
        this.applicationId = applicationId;
        this.decision = decision;
        this.reasoning = reasoning;
        this.fraudRisk = fraudRisk;
        this.modelContributionsJson = modelContributionsJson;
        this.modelVersion = modelVersion;
    }

    @PrePersist
    void setTimestampIfAbsent() {
        if (timestamp == null) {
            timestamp = new Timestamp(System.currentTimeMillis());
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getApplicationId() { return applicationId; }
    public void setApplicationId(Long applicationId) { this.applicationId = applicationId; }
    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getReasoning() { return reasoning; }
    public void setReasoning(String reasoning) { this.reasoning = reasoning; }
    public String getFraudRisk() { return fraudRisk; }
    public void setFraudRisk(String fraudRisk) { this.fraudRisk = fraudRisk; }
    public String getModelContributionsJson() { return modelContributionsJson; }
    public void setModelContributionsJson(String modelContributionsJson) { this.modelContributionsJson = modelContributionsJson; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public Timestamp getTimestamp() { return timestamp; }
    public void setTimestamp(Timestamp timestamp) { this.timestamp = timestamp; }
}
