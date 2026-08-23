package com.synchrony.nexcredit.integration;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Outcome-oriented connector stubs: shape-compatible with free-tier APIs.
 * Interview: point to this file to prove you know how to swap mock -> live without rewrite.
 *
 * Free keys: Plaid sandbox (dashboard.plaid.com), FinBox AA sandbox (dev.finbox.in),
 * Groq (console.groq.com), FingerprintJS (npm, no key), Home Credit Kaggle (no key).
 */
public class FreeTierConnectors {

    /**
     * Plaid sandbox -> cash-flow 4-signal mapping.
     * Real: Plaid transactions/get returns Array<Transaction>. Mock returns same shape.
     */
    public static Map<String, Integer> mapPlaidToCashflow(List<Map<String, Object>> plaidTransactions) {
        // Mock mapping: in prod, iterate plaidTransactions, sum credits, detect salary regularity
        Map<String, Integer> out = new LinkedHashMap<>();
        out.put("cashflowAvgMonthlyCredit", 42000);
        out.put("cashflowSalaryRegularity", 78);
        out.put("cashflowLowBalanceDays", 6);
        out.put("cashflowReturnedPayments", 0);
        return out;
    }

    /**
     * Account Aggregator (Sahamati) consent artefact -> same 4 fields.
     * Free mock: https://aa-sandbox.setu.co
     */
    public static Map<String, Integer> mapAaToCashflow(Map<String, Object> aaConsentData) {
        return mapPlaidToCashflow(List.of());
    }

    /**
     * FingerprintJS device fingerprint -> mobileUsageScore augmentation.
     * Free, open-source, no backend.
     * Real: FingerprintJS.get() -> { visitorId, components: { canvas, fonts, ... } }
     */
    public static int scoreDeviceFingerprint(Map<String, Object> fingerprint) {
        // Deterministic but non-constant: blend the fingerprint's content hash into a 55-94 band
        int hash = fingerprint == null ? 0 : fingerprint.hashCode();
        return Math.floorMod(hash, 40) + 55;
    }

    /**
     * Home Credit Kaggle (307k rows) -> our 5-feature mapping.
     * Real CSV: SK_ID_CURR, CODE_GENDER, FLAG_OWN_CAR, AMT_INCOME_TOTAL, EXT_SOURCE_1/2/3
     * Maps EXT_SOURCE ~ social signal, etc. Keep logistic pipeline unchanged.
     */
    public static Map<String, Object> mapHomeCreditRow(Map<String, String> csvRow) {
        Map<String, Object> app = new LinkedHashMap<>();
        app.put("applicantName", "HC-" + csvRow.getOrDefault("SK_ID_CURR", "000"));
        app.put("age", 28);
        app.put("annualIncome", csvRow.getOrDefault("AMT_INCOME_TOTAL", "240000"));
        app.put("mobileUsageScore", scaleExtSource(csvRow.get("EXT_SOURCE_1")));
        app.put("transactionBehaviorScore", scaleExtSource(csvRow.get("EXT_SOURCE_2")));
        app.put("socialSignalScore", scaleExtSource(csvRow.get("EXT_SOURCE_3")));
        app.put("employmentType", "SALARIED");
        return app;
    }

    private static int scaleExtSource(String v) {
        try { double d = Double.parseDouble(v); return (int) Math.round(d * 100); } catch (Exception e) { return 55; }
    }

    public static Map<String, Object> describe() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("plaidSandbox", "https://dashboard.plaid.com — free, 100 items, maps to cashflow* via mapPlaidToCashflow");
        d.put("aaSandbox", "https://dev.finbox.in / https://aa-sandbox.setu.co — consent artefact -> same 4 fields");
        d.put("fingerprintJs", "https://github.com/fingerprintjs/fingerprintjs — open source, no key, scoreDeviceFingerprint -> mobileUsageScore");
        d.put("homeCredit", "kaggle.com/datasets/home-credit-default-risk — 307k rows, mapHomeCreditRow keeps 5-feature pipeline");
        d.put("groq", "console.groq.com — free 6k req/day, already wired AiProperties.baseUrl");
        d.put("note", "All mocks are shape-compatible; swap is config/adapter, not redesign — outcome proof stays holdout AUC");
        return d;
    }
}
