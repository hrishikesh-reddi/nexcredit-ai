package com.synchrony.nexcredit.policy;

import com.synchrony.nexcredit.features.BankSignalFeatures;

import java.util.ArrayList;
import java.util.List;

/**
 * Stage 4 of the underwriting pipeline: deterministic hard rules, anomaly rules
 * and affordability rules applied on top of the statistical model output.
 * Every rule appends a human-readable tag so decisions stay explainable.
 */
public class PolicyFraudEngine {

    public record Outcome(List<String> tags, boolean forceReview, int confidenceCapPct) {
        public static Outcome none() {
            return new Outcome(List.of(), false, Integer.MAX_VALUE);
        }
    }

    public Outcome apply(BankSignalFeatures f) {
        List<String> tags = new ArrayList<>();
        boolean forceReview = false;
        int cap = Integer.MAX_VALUE;

        if (f.emiBurdenRatio() > 0.60) {
            tags.add("AFFORDABILITY: requested EMI exceeds 60% of monthly income");
            forceReview = true;
        } else if (f.emiBurdenRatio() > 0.45) {
            tags.add("AFFORDABILITY STRAIN: EMI above 45% of monthly income, confidence capped");
            cap = 70;
        }

        if (f.monthlySurplus() < 0) {
            tags.add("CASH-FLOW DEFICIT: statement outflows exceed inflows by " + String.format("%.0f", -f.monthlySurplus()) + "/month");
            forceReview = true;
        } else if (f.monthlyIncome() > 0 && f.monthlySurplus() < f.monthlyIncome() * 0.05) {
            tags.add("THIN BUFFER: monthly surplus below 5% of income");
            cap = Math.min(cap, 74);
        }

        if (f.suspiciousTxnCount() >= 3) {
            tags.add("ANOMALY: " + f.suspiciousTxnCount() + " suspicious transactions detected in statement window");
            forceReview = true;
        } else if (f.suspiciousTxnCount() >= 1) {
            tags.add("ANOMALY WATCH: " + f.suspiciousTxnCount() + " unusual transaction(s) noted for reviewer");
            cap = Math.min(cap, 75);
        }

        if (f.lowBalanceMonthsPerYear() >= 9) {
            tags.add("LIQUIDITY STRESS: balance dipped below buffer in " + f.lowBalanceMonthsPerYear() + "/12 months");
            cap = Math.min(cap, 72);
        }

        if (f.incomeStability() < 40) {
            tags.add("UNSTABLE INFLOWS: income regularity below 40/100");
            cap = Math.min(cap, 74);
        }

        if (f.recurringObligationsCount() >= 6) {
            tags.add("HIGH COMMITMENTS: " + f.recurringObligationsCount() + " recurring obligations detected");
            cap = Math.min(cap, 75);
        } else if (f.recurringObligationsCount() >= 5) {
            tags.add("ELEVATED COMMITMENTS: " + f.recurringObligationsCount() + " recurring obligations detected, confidence capped");
            cap = Math.min(cap, 78);
        }

        return new Outcome(tags, forceReview, cap);
    }
}
