package com.synchrony.nexcredit.transactions;

import java.util.List;
import java.util.Map;

/** Result of ingesting a financial-data stream and recomputing cash-flow features. */
public record IngestionResult(
        Long applicationId,
        String provider,
        String subjectKey,
        int transactionCount,
        int monthsObserved,
        Map<String, Object> features,
        List<String> derivationNotes,
        List<String> suspiciousFindings,
        CreditDecisionView decision) {

    public record CreditDecisionView(
            String decision,
            int confidence,
            double pdProbability,
            String fraudRisk,
            String gradeBand,
            Long recommendedLimit,
            List<String> reasonCodes,
            String reasoning) {
    }
}
