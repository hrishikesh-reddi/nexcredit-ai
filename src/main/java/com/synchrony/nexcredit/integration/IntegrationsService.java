package com.synchrony.nexcredit.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class IntegrationsService {

    private final String plaidClientId;
    private final String fingerprintJsKey;
    private final String fingerprintJsKeyVite;
    private final String realtimeBureauKey;
    private final String openaiApiKey;

    public IntegrationsService(
            @Value("${PLAID_CLIENT_ID:}") String plaidClientId,
            @Value("${FINGERPRINTJS_KEY:}") String fingerprintJsKey,
            @Value("${VITE_FINGERPRINTJS_KEY:}") String fingerprintJsKeyVite,
            @Value("${REALTIME_BUREAU_KEY:}") String realtimeBureauKey,
            @Value("${OPENAI_API_KEY:}") String openaiApiKey) {
        this.plaidClientId = plaidClientId == null ? "" : plaidClientId.trim();
        this.fingerprintJsKey = fingerprintJsKey == null ? "" : fingerprintJsKey.trim();
        this.fingerprintJsKeyVite = fingerprintJsKeyVite == null ? "" : fingerprintJsKeyVite.trim();
        this.realtimeBureauKey = realtimeBureauKey == null ? "" : realtimeBureauKey.trim();
        this.openaiApiKey = openaiApiKey == null ? "" : openaiApiKey.trim();
    }

    public Map<String, IntegrationStatus> getStatus() {
        Map<String, IntegrationStatus> status = new LinkedHashMap<>();

        status.put("plaid", new IntegrationStatus(
                !plaidClientId.isEmpty(),
                "Live 6-month transaction pull (sandbox)"));

        boolean fingerprint = !fingerprintJsKey.isEmpty() || !fingerprintJsKeyVite.isEmpty();
        status.put("fingerprintjs", new IntegrationStatus(
                fingerprint,
                "Device and bot fingerprinting for fraud scoring"));

        status.put("rapidapi_bureau", new IntegrationStatus(
                !realtimeBureauKey.isEmpty(),
                "Real-time credit bureau pull (CIBIL / Experian)"));

        status.put("groq_copilot", new IntegrationStatus(
                !openaiApiKey.isEmpty(),
                "Groq-powered underwriting copilot"));

        return status;
    }
}
