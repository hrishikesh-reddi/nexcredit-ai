package com.synchrony.nexcredit.credit;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {
    private final AuditLogService auditLogService;

    public AuditController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping("/logs")
    public List<AuditLog> getLogs() {
        return auditLogService.getAllLogs();
    }

    @GetMapping("/logs/{applicationId}")
    public List<AuditLog> getApplicationLogs(@PathVariable Long applicationId) {
        return auditLogService.getLogsForApplication(applicationId);
    }
}
