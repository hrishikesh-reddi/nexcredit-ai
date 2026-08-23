package com.synchrony.nexcredit.features;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Statement-derived signal features computed from consented bank/UPI data
 * (Plaid Sandbox transactions, uploaded statements, or intake aggregates).
 * These power the policy/fraud layer and enrich explanations; the PD model
 * itself trains on Home Credit application attributes.
 */
public record BankSignalFeatures(
        double monthlyIncome,
        double incomeStability,
        double averageBalance,
        double emiBurdenRatio,
        double expenseVolatilityPct,
        int lowBalanceMonthsPerYear,
        int recurringObligationsCount,
        int suspiciousTxnCount,
        double monthlySurplus) {

    public Map<String, Double> asMap() {
        Map<String, Double> m = new LinkedHashMap<>();
        m.put("monthlyIncome", round(monthlyIncome));
        m.put("incomeStability", round(incomeStability));
        m.put("averageBalance", round(averageBalance));
        m.put("emiBurdenRatio", round(emiBurdenRatio));
        m.put("expenseVolatilityPct", round(expenseVolatilityPct));
        m.put("lowBalanceMonthsPerYear", (double) lowBalanceMonthsPerYear);
        m.put("recurringObligationsCount", (double) recurringObligationsCount);
        m.put("suspiciousTxnCount", (double) suspiciousTxnCount);
        m.put("monthlySurplus", round(monthlySurplus));
        return m;
    }

    private static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
