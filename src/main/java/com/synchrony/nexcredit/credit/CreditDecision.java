package com.synchrony.nexcredit.credit;

import java.util.List;
import java.util.Map;

public class CreditDecision {
    private Long applicationId;
    private String creditDecision;
    private int confidenceScore;
    private String reasoning;
    private final String fraudRisk;
    private Map<String, Double> modelContributions;
    private Map<String, Double> fraudSubSignals;
    private String modelVersion = "logreg-hybrid-v3";
    private String dataProvenance = "home-credit-real + consented-signal-simulation";
    private boolean mlPowered;
    private long decisionLatencyMs;
    private Long recommendedCreditLimit;
    private List<String> adverseReasonCodes;
    private int cashflowUplift;
    /** Transient: hard confidence ceiling set by the policy/fraud gates; the cash-flow lift may not exceed it. */
    private transient int policyConfidenceCap = Integer.MAX_VALUE;
    private Double pdProbability;
    private String gradeBand;
    private Map<String, Double> statementFeatures;

    /** Separate identity/fraud risk score (0-100), kept distinct from the creditworthiness confidence. */
    private int fraudScore;
    /** Pricing band assigned on approval (Prime / Standard / Subprime). */
    private String pricingBand;
    /** Approval conditions / ongoing monitoring obligations. */
    private List<String> conditions;
    /** Policy, fraud and fairness gates that fired on this application. */
    private List<String> policyGates;
    /** Mocked internal-tradeline + partner-bureau advantage, when consented. */
    private String partnerSignals;
    /** One-line, policy-driven rationale (not an LLM narrative). */
    private String decisionRationale;
    /** Dynamic "what data was pulled and why" timeline (PRISM-style decisioning). */
    private List<Map<String, String>> dataPullSources;
    /** Multi-agent handoff trace: what each agent contributed. */
    private List<Map<String, String>> agentTrace;

    public CreditDecision(String creditDecision, int confidenceScore, String reasoning, String fraudRisk) {
        this.creditDecision = creditDecision;
        this.confidenceScore = confidenceScore;
        this.reasoning = reasoning;
        this.fraudRisk = fraudRisk;
    }

    public String getCreditDecision() { return creditDecision; }
    public void setCreditDecision(String creditDecision) { this.creditDecision = creditDecision; }
    public int getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(int confidenceScore) { this.confidenceScore = confidenceScore; }
    public String getReasoning() { return reasoning; }
    public void setReasoning(String reasoning) { this.reasoning = reasoning; }
    public String getFraudRisk() { return fraudRisk; }
    public Long getApplicationId() { return applicationId; }
    public void setApplicationId(Long applicationId) { this.applicationId = applicationId; }
    public Map<String, Double> getModelContributions() { return modelContributions; }
    public void setModelContributions(Map<String, Double> modelContributions) { this.modelContributions = modelContributions; }
    public Map<String, Double> getFraudSubSignals() { return fraudSubSignals; }
    public void setFraudSubSignals(Map<String, Double> fraudSubSignals) { this.fraudSubSignals = fraudSubSignals; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public String getDataProvenance() { return dataProvenance; }
    public void setDataProvenance(String dataProvenance) { this.dataProvenance = dataProvenance; }
    public boolean isMlPowered() { return mlPowered; }
    public void setMlPowered(boolean mlPowered) { this.mlPowered = mlPowered; }
    public long getDecisionLatencyMs() { return decisionLatencyMs; }
    public void setDecisionLatencyMs(long decisionLatencyMs) { this.decisionLatencyMs = decisionLatencyMs; }
    public Long getRecommendedCreditLimit() { return recommendedCreditLimit; }
    public void setRecommendedCreditLimit(Long recommendedCreditLimit) { this.recommendedCreditLimit = recommendedCreditLimit; }
    public List<String> getAdverseReasonCodes() { return adverseReasonCodes; }
    public void setAdverseReasonCodes(List<String> adverseReasonCodes) { this.adverseReasonCodes = adverseReasonCodes; }
    public int getCashflowUplift() { return cashflowUplift; }
    public void setCashflowUplift(int cashflowUplift) { this.cashflowUplift = cashflowUplift; }
    public int getPolicyConfidenceCap() { return policyConfidenceCap; }
    public void setPolicyConfidenceCap(int cap) {
        this.policyConfidenceCap = Math.min(this.policyConfidenceCap, cap);
    }
    public Double getPdProbability() { return pdProbability; }
    public void setPdProbability(Double pdProbability) { this.pdProbability = pdProbability; }
    public String getGradeBand() { return gradeBand; }
    public void setGradeBand(String gradeBand) { this.gradeBand = gradeBand; }
    public Map<String, Double> getStatementFeatures() { return statementFeatures; }
    public void setStatementFeatures(Map<String, Double> statementFeatures) { this.statementFeatures = statementFeatures; }
    public int getFraudScore() { return fraudScore; }
    public void setFraudScore(int fraudScore) { this.fraudScore = fraudScore; }
    public String getPricingBand() { return pricingBand; }
    public void setPricingBand(String pricingBand) { this.pricingBand = pricingBand; }
    public List<String> getConditions() { return conditions; }
    public void setConditions(List<String> conditions) { this.conditions = conditions; }
    public List<String> getPolicyGates() { return policyGates; }
    public void setPolicyGates(List<String> policyGates) { this.policyGates = policyGates; }
    public String getPartnerSignals() { return partnerSignals; }
    public void setPartnerSignals(String partnerSignals) { this.partnerSignals = partnerSignals; }
    public String getDecisionRationale() { return decisionRationale; }
    public void setDecisionRationale(String decisionRationale) { this.decisionRationale = decisionRationale; }
    public List<Map<String, String>> getDataPullSources() { return dataPullSources; }
    public void setDataPullSources(List<Map<String, String>> dataPullSources) { this.dataPullSources = dataPullSources; }
    public List<Map<String, String>> getAgentTrace() { return agentTrace; }
    public void setAgentTrace(List<Map<String, String>> agentTrace) { this.agentTrace = agentTrace; }
}
