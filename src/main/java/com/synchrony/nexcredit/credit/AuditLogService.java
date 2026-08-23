package com.synchrony.nexcredit.credit;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class AuditLogService {
    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(CreditApplication application, CreditDecision decision) {
        auditLogRepository.save(new AuditLog(
                application.getId(),
                decision.getCreditDecision(),
                decision.getReasoning(),
                decision.getFraudRisk(),
                toJson(decision.getModelContributions()),
                decision.getModelVersion()));
    }

    private String toJson(Map<String, Double> contributions) {
        if (contributions == null || contributions.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Double> entry : contributions.entrySet()) {
            if (!first) {
                sb.append(",");
            }
            first = false;
            sb.append("\"").append(entry.getKey()).append("\":").append(entry.getValue());
        }
        sb.append("}");
        return sb.toString();
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    public List<AuditLog> getLogsForApplication(Long applicationId) {
        return auditLogRepository.findByApplicationIdOrderByTimestampDesc(applicationId);
    }
}
