package com.synchrony.nexcredit.ai;

import java.util.List;

public record CopilotResponse(String answer, boolean aiPowered, String disclaimer, List<String> agentSteps) {
    public CopilotResponse(String answer, boolean aiPowered, String disclaimer) {
        this(answer, aiPowered, disclaimer, List.of());
    }
}
