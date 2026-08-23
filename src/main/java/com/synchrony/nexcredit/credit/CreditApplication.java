package com.synchrony.nexcredit.credit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.sql.Timestamp;

@Entity
@Table(name = "credit_applications")
public class CreditApplication {

    @Id
    @SequenceGenerator(name = "credit_application_sequence", sequenceName = "credit_application_sequence", allocationSize = 1)
    @GeneratedValue(generator = "credit_application_sequence", strategy = GenerationType.SEQUENCE)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String applicantName;

    @NotNull
    @Min(18)
    private Integer age;

    @NotNull
    @Min(0)
    private BigDecimal annualIncome;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmploymentType employmentType;

    @NotNull @Min(0) @Max(100)
    private Integer mobileUsageScore;

    @NotNull @Min(0) @Max(100)
    private Integer transactionBehaviorScore;

    @NotNull @Min(0) @Max(100)
    private Integer socialSignalScore;

    private String creditDecision;
    private Integer confidenceScore;
    @Column(length = 1000)
    private String reasoning;
    private String fraudRisk;
    @Enumerated(EnumType.STRING)
    private ReviewStatus reviewStatus;

    // Consented cash-flow sharing (Account Aggregator style). Populated only when the applicant opts in.
    private Boolean cashflowShared;
    /** Consented internal-tradeline + partner-bureau enrichment (mocked PRISM-style advantage). */
    private Boolean partnerEnriched;
    private Integer cashflowAvgMonthlyCredit;
    private Integer cashflowSalaryRegularity;
    private Integer cashflowLowBalanceDays;
    private Integer cashflowReturnedPayments;

    // Loan request attributes (Home Credit schema analogues: AMT_CREDIT / AMT_ANNUITY / CNT_CHILDREN / DAYS_EMPLOYED / NAME_EDUCATION_TYPE)
    private BigDecimal requestedAmount;
    private BigDecimal requestedEmi;
    private Integer dependentsCount;
    private Integer employmentYears;
    private String educationLevel;

    // Consented bank-statement aggregates (Plaid Sandbox transactions or uploaded statement path)
    private Integer stmtAvgMonthlyBalance;
    private Integer stmtMonthlySurplus;
    private Integer stmtExpenseVolatilityPct;
    private Integer stmtLowBalanceMonths;
    private Integer stmtRecurringDebits;
    private Integer stmtSuspiciousTxns;

    // Decision summary fields (copied from CreditDecision so the applications endpoint carries them)
    private Long recommendedCreditLimit;
    @Column(length = 600)
    private String adverseReasonCodes;
    private Integer fraudScore;
    @Column(length = 40)
    private String pricingBand;
    private Integer cashflowUplift;
    private Double pdProbability;
    @Column(length = 20)
    private String gradeBand;
    @Column(length = 1600)
    private String decisionRationale;
    @Column(length = 800)
    private String partnerSignals;
    @Column(length = 2000)
    private String conditions;
    @Column(length = 2000)
    private String policyGates;
    @Column(length = 3000)
    private String dataPullSources;
    @Column(length = 3000)
    private String agentTrace;
    private Long decisionLatencyMs;

    @Column(length = 1000)
    private String reviewerNotes;
    @Column(length = 500)
    private String documentPath;
    @Column(nullable = false, updatable = false)
    private Timestamp createdAt;

    @PrePersist
    void setCreatedAtIfAbsent() {
        if (createdAt == null) {
            createdAt = new Timestamp(System.currentTimeMillis());
        }
    }

    public CreditApplication() { }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public BigDecimal getAnnualIncome() { return annualIncome; }
    public void setAnnualIncome(BigDecimal annualIncome) { this.annualIncome = annualIncome; }
    public EmploymentType getEmploymentType() { return employmentType; }
    public void setEmploymentType(EmploymentType employmentType) { this.employmentType = employmentType; }
    public Integer getMobileUsageScore() { return mobileUsageScore; }
    public void setMobileUsageScore(Integer mobileUsageScore) { this.mobileUsageScore = mobileUsageScore; }
    public Integer getTransactionBehaviorScore() { return transactionBehaviorScore; }
    public void setTransactionBehaviorScore(Integer transactionBehaviorScore) { this.transactionBehaviorScore = transactionBehaviorScore; }
    public Integer getSocialSignalScore() { return socialSignalScore; }
    public void setSocialSignalScore(Integer socialSignalScore) { this.socialSignalScore = socialSignalScore; }
    public String getCreditDecision() { return creditDecision; }
    public void setCreditDecision(String creditDecision) { this.creditDecision = creditDecision; }
    public Integer getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Integer confidenceScore) { this.confidenceScore = confidenceScore; }
    public String getReasoning() { return reasoning; }
    public void setReasoning(String reasoning) { this.reasoning = reasoning; }
    public String getFraudRisk() { return fraudRisk; }
    public void setFraudRisk(String fraudRisk) { this.fraudRisk = fraudRisk; }
    public ReviewStatus getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(ReviewStatus reviewStatus) { this.reviewStatus = reviewStatus; }
    public String getReviewerNotes() { return reviewerNotes; }
    public void setReviewerNotes(String reviewerNotes) { this.reviewerNotes = reviewerNotes; }
    public String getDocumentPath() { return documentPath; }
    public void setDocumentPath(String documentPath) { this.documentPath = documentPath; }
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
    public Boolean getCashflowShared() { return cashflowShared; }
    public void setCashflowShared(Boolean cashflowShared) { this.cashflowShared = cashflowShared; }
    public Boolean getPartnerEnriched() { return partnerEnriched; }
    public void setPartnerEnriched(Boolean partnerEnriched) { this.partnerEnriched = partnerEnriched; }
    public Integer getCashflowAvgMonthlyCredit() { return cashflowAvgMonthlyCredit; }
    public void setCashflowAvgMonthlyCredit(Integer cashflowAvgMonthlyCredit) { this.cashflowAvgMonthlyCredit = cashflowAvgMonthlyCredit; }
    public Integer getCashflowSalaryRegularity() { return cashflowSalaryRegularity; }
    public void setCashflowSalaryRegularity(Integer cashflowSalaryRegularity) { this.cashflowSalaryRegularity = cashflowSalaryRegularity; }
    public Integer getCashflowLowBalanceDays() { return cashflowLowBalanceDays; }
    public void setCashflowLowBalanceDays(Integer cashflowLowBalanceDays) { this.cashflowLowBalanceDays = cashflowLowBalanceDays; }
    public Integer getCashflowReturnedPayments() { return cashflowReturnedPayments; }
    public void setCashflowReturnedPayments(Integer cashflowReturnedPayments) { this.cashflowReturnedPayments = cashflowReturnedPayments; }
    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }
    public BigDecimal getRequestedEmi() { return requestedEmi; }
    public void setRequestedEmi(BigDecimal requestedEmi) { this.requestedEmi = requestedEmi; }
    public Integer getDependentsCount() { return dependentsCount; }
    public void setDependentsCount(Integer dependentsCount) { this.dependentsCount = dependentsCount; }
    public Integer getEmploymentYears() { return employmentYears; }
    public void setEmploymentYears(Integer employmentYears) { this.employmentYears = employmentYears; }
    public String getEducationLevel() { return educationLevel; }
    public void setEducationLevel(String educationLevel) { this.educationLevel = educationLevel; }
    public Integer getStmtAvgMonthlyBalance() { return stmtAvgMonthlyBalance; }
    public void setStmtAvgMonthlyBalance(Integer stmtAvgMonthlyBalance) { this.stmtAvgMonthlyBalance = stmtAvgMonthlyBalance; }
    public Integer getStmtMonthlySurplus() { return stmtMonthlySurplus; }
    public void setStmtMonthlySurplus(Integer stmtMonthlySurplus) { this.stmtMonthlySurplus = stmtMonthlySurplus; }
    public Integer getStmtExpenseVolatilityPct() { return stmtExpenseVolatilityPct; }
    public void setStmtExpenseVolatilityPct(Integer stmtExpenseVolatilityPct) { this.stmtExpenseVolatilityPct = stmtExpenseVolatilityPct; }
    public Integer getStmtLowBalanceMonths() { return stmtLowBalanceMonths; }
    public void setStmtLowBalanceMonths(Integer stmtLowBalanceMonths) { this.stmtLowBalanceMonths = stmtLowBalanceMonths; }
    public Integer getStmtRecurringDebits() { return stmtRecurringDebits; }
    public void setStmtRecurringDebits(Integer stmtRecurringDebits) { this.stmtRecurringDebits = stmtRecurringDebits; }
    public Integer getStmtSuspiciousTxns() { return stmtSuspiciousTxns; }
    public void setStmtSuspiciousTxns(Integer stmtSuspiciousTxns) { this.stmtSuspiciousTxns = stmtSuspiciousTxns; }

    public Long getRecommendedCreditLimit() { return recommendedCreditLimit; }
    public void setRecommendedCreditLimit(Long recommendedCreditLimit) { this.recommendedCreditLimit = recommendedCreditLimit; }
    public String getAdverseReasonCodes() { return adverseReasonCodes; }
    public void setAdverseReasonCodes(String adverseReasonCodes) { this.adverseReasonCodes = adverseReasonCodes; }
    public Integer getFraudScore() { return fraudScore; }
    public void setFraudScore(Integer fraudScore) { this.fraudScore = fraudScore; }
    public String getPricingBand() { return pricingBand; }
    public void setPricingBand(String pricingBand) { this.pricingBand = pricingBand; }
    public Integer getCashflowUplift() { return cashflowUplift; }
    public void setCashflowUplift(Integer cashflowUplift) { this.cashflowUplift = cashflowUplift; }
    public Double getPdProbability() { return pdProbability; }
    public void setPdProbability(Double pdProbability) { this.pdProbability = pdProbability; }
    public String getGradeBand() { return gradeBand; }
    public void setGradeBand(String gradeBand) { this.gradeBand = gradeBand; }
    public String getDecisionRationale() { return decisionRationale; }
    public void setDecisionRationale(String decisionRationale) { this.decisionRationale = decisionRationale; }
    public String getPartnerSignals() { return partnerSignals; }
    public void setPartnerSignals(String partnerSignals) { this.partnerSignals = partnerSignals; }
    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }
    public String getPolicyGates() { return policyGates; }
    public void setPolicyGates(String policyGates) { this.policyGates = policyGates; }
    public String getDataPullSources() { return dataPullSources; }
    public void setDataPullSources(String dataPullSources) { this.dataPullSources = dataPullSources; }
    public String getAgentTrace() { return agentTrace; }
    public void setAgentTrace(String agentTrace) { this.agentTrace = agentTrace; }
    public Long getDecisionLatencyMs() { return decisionLatencyMs; }
    public void setDecisionLatencyMs(Long decisionLatencyMs) { this.decisionLatencyMs = decisionLatencyMs; }
}
