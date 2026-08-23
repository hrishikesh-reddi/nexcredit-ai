package com.synchrony.nexcredit.transactions;

import com.synchrony.nexcredit.credit.CreditApplication;
import com.synchrony.nexcredit.credit.CreditApplicationRepository;
import com.synchrony.nexcredit.credit.CreditDecision;
import com.synchrony.nexcredit.credit.CreditUnderwritingService;
import com.synchrony.nexcredit.integration.FinancialDataProvider;
import com.synchrony.nexcredit.integration.LocalPersonaProvider;
import com.synchrony.nexcredit.integration.PlaidSandboxProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stage 1+2 orchestrator: pulls a transaction stream from a {@link FinancialDataProvider},
 * derives cash-flow features, writes the aggregates onto the application (so the existing
 * model + policy pipeline consumes them unchanged), then re-runs underwriting.
 *
 * Also powers the live adverse-event simulation: inject transactions (gambling spike,
 * post-salary cash-out, new EMI...) into the last-ingested stream and recalculate —
 * producing a genuine before/after risk delta computed from data, not scripted numbers.
 */
@Service
public class TransactionIngestionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(TransactionIngestionService.class);

    /** Canonical persona subject keys (see LocalPersonaProvider). */
    public static final String PERSONA_HEALTHY = "healthy-ntc";
    public static final String PERSONA_UNSTABLE = "unstable-obligations";
    public static final String PERSONA_SUSPICIOUS = "suspicious-inconsistency";

    private final CreditApplicationRepository applications;
    private final CreditUnderwritingService underwriting;
    private final TransactionFeatureExtractor extractor;
    private final LocalPersonaProvider localProvider;
    private final PlaidSandboxProvider plaidProvider;

    /** Last ingested stream per application, kept so adverse events mutate real ingested data. */
    private final Map<Long, CachedStream> streamCache = new ConcurrentHashMap<>();

    public TransactionIngestionService(CreditApplicationRepository applications,
                                       CreditUnderwritingService underwriting,
                                       TransactionFeatureExtractor extractor,
                                       LocalPersonaProvider localProvider,
                                       PlaidSandboxProvider plaidProvider) {
        this.applications = applications;
        this.underwriting = underwriting;
        this.extractor = extractor;
        this.localProvider = localProvider;
        this.plaidProvider = plaidProvider;
    }

    public IngestionResult ingest(Long applicationId, String providerName, String subjectKey) {
        CreditApplication app = applications.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));
        double declaredAnnual = app.getAnnualIncome() == null ? 0 : app.getAnnualIncome().doubleValue();

        FinancialDataProvider provider = selectProvider(providerName);
        List<TransactionRecord> txns = provider.fetch(subjectKey, declaredAnnual);
        CashflowFeatures features = extractor.extract(txns, app.getAnnualIncome());
        applyToApplication(app, features);

        CreditDecision decision = underwriting.analyze(app);
        streamCache.put(applicationId, new CachedStream(subjectKey == null ? "" : subjectKey,
                provider.name(), new ArrayList<>(txns)));

        LOGGER.info("transactions_ingested applicationId={} provider={} txns={} salaryDetected={} regularity={} suspicious={}",
                applicationId, provider.name(), txns.size(), features.isSalaryDetected(),
                features.getSalaryRegularityPct(), features.getSuspiciousTxnCount());

        return toResult(applicationId, provider.name(), subjectKey == null ? "" : subjectKey,
                txns.size(), features, decision);
    }

    /**
     * Live adverse-event simulation. Mutates the cached stream for the application
     * (regenerating from the persona when absent), recomputes every feature from raw
     * transactions and re-runs the full underwriting pipeline.
     */
    public AdverseEventResult simulateAdverseEvent(Long applicationId, String eventKind) {
        CreditApplication app = applications.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));
        CachedStream cached = streamCache.get(applicationId);
        if (cached == null) {
            throw new IllegalStateException("Ingest transactions for this application first");
        }
        double monthlyIncome = app.getAnnualIncome() == null ? 40_000 : app.getAnnualIncome().doubleValue() / 12.0;

        AdverseEvent event = AdverseEvent.byKind(eventKind == null ? "" : eventKind);
        if (event == null) {
            throw new IllegalArgumentException("Unknown adverse event kind: " + eventKind
                    + " (valid: " + AdverseEvent.validKinds() + ")");
        }

        IngestionResult before = snapshotResult(app, cached);
        int injectedCount = event.transactionCount(monthlyIncome);
        List<TransactionRecord> injected = event.injectInto(cached.transactions(), LocalDate.now(), monthlyIncome);
        CashflowFeatures afterFeatures = extractor.extract(injected, app.getAnnualIncome());
        applyToApplication(app, afterFeatures);
        CreditDecision afterDecision = underwriting.analyze(app);

        streamCache.put(applicationId, new CachedStream(cached.subjectKey(), cached.provider(),
                new ArrayList<>(injected)));
        IngestionResult after = toResult(applicationId, cached.provider(), cached.subjectKey(),
                injected.size(), afterFeatures, afterDecision);

        LOGGER.info("adverse_event_simulated applicationId={} kind={} injected={} pdBefore={} pdAfter={}",
                applicationId, event.kind(), injectedCount,
                before.decision() == null ? null : before.decision().pdProbability(),
                afterDecision.getPdProbability());

        return new AdverseEventResult(applicationId, event.kind(), event.description(),
                injectedCount, before, after, featureDeltas(before.features(), after.features()));
    }

    /**
     * Returns the cash-flow feature overlay for an application. The feature set is the
     * same object the underwriting pipeline consumes (salary regularity, surplus, low-balance
     * days, volatility, savings trend…) plus a composite cash-flow score and the human-readable
     * derivation notes, so a reviewer can audit exactly how each number was produced.
     *
     * Self-sufficient: if no statement has been ingested yet for this application it pulls the
     * local synthetic persona stream first, so the endpoint works standalone (the frontend also
     * ingests before calling, and the 20s refresh relies on the cached stream).
     */
    public Map<String, Object> getCashflowFeatures(Long applicationId) {
        CreditApplication app = applications.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));

        CachedStream cached = streamCache.get(applicationId);
        List<TransactionRecord> txns;
        if (cached == null) {
            ingest(applicationId, "local", null);
            CachedStream after = streamCache.get(applicationId);
            txns = after == null ? List.of() : after.transactions();
        } else {
            txns = cached.transactions();
        }

        double declaredAnnual = app.getAnnualIncome() == null ? 0 : app.getAnnualIncome().doubleValue();
        CashflowFeatures f = extractor.extract(txns, declaredAnnual > 0 ? java.math.BigDecimal.valueOf((long) declaredAnnual) : null);
        CreditDecision decision = underwriting.evaluate(app);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("avgMonthlyCredit", f.getAvgMonthlyCredit());
        out.put("salaryCreditCount", f.getSalaryCreditCount());
        out.put("lowBalanceDays", f.getLowBalanceDays());
        out.put("returnedPayments", f.getReturnedPayments());
        out.put("incomeVolatility", Math.round(f.getExpenseVolatilityPct() / 10.0) / 10.0 / 10.0); // percent -> fraction
        out.put("savingsTrend", Math.round(f.getSavingsTrend() * 1000.0) / 1000.0);
        out.put("cashflowScore", computeCashflowScore(f));
        out.put("explanation", decision == null ? "" : decision.getReasoning());
        out.put("reasonCodes", decision == null || decision.getAdverseReasonCodes() == null ? List.of() : decision.getAdverseReasonCodes());
        out.put("appliedToDecision", decision == null ? "" : decision.getDecisionRationale());
        out.put("derivationNotes", f.getDerivationNotes());
        out.put("suspiciousFindings", f.getSuspiciousFindings());
        out.put("raw", f.asMap());
        return out;
    }

    /** Composite 0-100 health score from the raw cash-flow signals. */
    private int computeCashflowScore(CashflowFeatures f) {
        int score = 50;
        if (f.isSalaryDetected()) score += 12;
        score += Math.min(20, f.getSalaryRegularityPct() / 5);
        if (f.getMonthlySurplus() > 0) score += 10; else score -= 8;
        score -= Math.min(25, f.getLowBalanceDays() * 2);
        score -= Math.min(20, f.getExpenseVolatilityPct() / 3);
        score -= Math.min(15, f.getSuspiciousTxnCount() * 4);
        score -= Math.min(15, f.getReturnedPayments() * 5);
        return Math.max(0, Math.min(100, score));
    }

    public Map<String, Object> integrationStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put(localProvider.name(), localProvider.isAvailable());
        status.put(plaidProvider.name(), plaidProvider.isAvailable());
        status.put("plaidSetupNote", "Set PLAID_CLIENT_ID and PLAID_SECRET (free sandbox: dashboard.plaid.com) to enable live Plaid pulls.");
        return status;
    }

    private FinancialDataProvider selectProvider(String preferred) {
        if ("plaid".equalsIgnoreCase(preferred)) {
            if (!plaidProvider.isAvailable()) {
                throw new IllegalStateException(
                        "Plaid is not configured on this deployment. Set PLAID_CLIENT_ID and PLAID_SECRET "
                                + "(sandbox credentials are free at dashboard.plaid.com), or use the local persona provider.");
            }
            return plaidProvider;
        }
        return localProvider;
    }

    private void applyToApplication(CreditApplication app, CashflowFeatures f) {
        app.setStmtAvgMonthlyBalance(f.getAvgMonthlyBalance());
        app.setStmtMonthlySurplus(f.getMonthlySurplus());
        app.setStmtExpenseVolatilityPct(f.getExpenseVolatilityPct());
        app.setStmtLowBalanceMonths(f.getLowBalanceMonths());
        app.setStmtRecurringDebits(f.getRecurringObligationsCount());
        app.setStmtSuspiciousTxns(f.getSuspiciousTxnCount());
        app.setCashflowShared(true);
        app.setCashflowAvgMonthlyCredit(f.getAvgMonthlyCredit());
        app.setCashflowSalaryRegularity(f.getSalaryRegularityPct());
        app.setCashflowLowBalanceDays(f.getLowBalanceDays());
        app.setCashflowReturnedPayments(f.getReturnedPayments());
    }

    private IngestionResult snapshotResult(CreditApplication app, CachedStream cached) {
        // Re-extract from the pre-injection stream WITHOUT persisting anything.
        double declaredAnnual = app.getAnnualIncome() == null ? 0 : app.getAnnualIncome().doubleValue();
        CashflowFeatures beforeFeatures = extractor.extract(cached.transactions(),
                declaredAnnual > 0 ? java.math.BigDecimal.valueOf((long) declaredAnnual) : null);
        CreditDecision beforeDecision = underwriting.evaluate(app);
        return toResult(app.getId(), cached.provider(), cached.subjectKey(),
                cached.transactions().size(), beforeFeatures, beforeDecision);
    }

    private IngestionResult toResult(Long applicationId, String provider, String subjectKey,
                                     int txnCount, CashflowFeatures f, CreditDecision d) {
        IngestionResult.CreditDecisionView view = d == null ? null : new IngestionResult.CreditDecisionView(
                d.getCreditDecision(),
                d.getConfidenceScore(),
                d.getPdProbability(),
                d.getFraudRisk(),
                d.getGradeBand(),
                d.getRecommendedCreditLimit(),
                d.getAdverseReasonCodes() == null ? List.of() : d.getAdverseReasonCodes(),
                d.getReasoning());
        return new IngestionResult(applicationId, provider, subjectKey, txnCount, f.getMonthsObserved(),
                f.asMap(), f.getDerivationNotes(), f.getSuspiciousFindings(), view);
    }

    private Map<String, Object> featureDeltas(Map<String, Object> before, Map<String, Object> after) {
        Map<String, Object> deltas = new LinkedHashMap<>();
        for (String key : List.of("monthlySurplus", "salaryRegularityPct", "suspiciousTxnCount",
                "lowBalanceDays", "expenseVolatilityPct", "returnedPayments", "avgMonthlyBalance",
                "recurringObligationsCount")) {
            Object b = before.get(key);
            Object a = after.get(key);
            if (b instanceof Number bn && a instanceof Number an) {
                deltas.put(key, an.doubleValue() - bn.doubleValue());
            } else {
                deltas.put(key, Map.of("before", String.valueOf(b), "after", String.valueOf(a)));
            }
        }
        return deltas;
    }

    private record CachedStream(String subjectKey, String provider, List<TransactionRecord> transactions) { }
}
