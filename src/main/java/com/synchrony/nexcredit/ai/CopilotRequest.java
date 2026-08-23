package com.synchrony.nexcredit.ai;

import jakarta.validation.constraints.NotBlank;

public record CopilotRequest(Long applicationId, String question) {
    public CopilotRequest {
        if (question == null || question.isBlank()) {
            throw new IllegalArgumentException("A question is required");
        }
    }
}
