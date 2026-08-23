package com.synchrony.nexcredit.transactions;

import java.util.Map;

/** Before/after comparison produced when an adverse financial event is simulated live. */
public record AdverseEventResult(
        Long applicationId,
        String eventKind,
        String eventDescription,
        int transactionsInjected,
        IngestionResult before,
        IngestionResult after,
        Map<String, Object> featureDeltas) {
}
