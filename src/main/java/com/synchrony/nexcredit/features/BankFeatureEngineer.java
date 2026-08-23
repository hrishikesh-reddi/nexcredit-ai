package com.synchrony.nexcredit.features;

import com.synchrony.nexcredit.credit.CreditApplication;
import org.springframework.stereotype.Component;

/**
 * Turns raw consented inputs (declared income, requested loan terms, and
 * bank-statement aggregates) into model/policy-ready signal features.
 */
@Component
public class BankFeatureEngineer {

    public BankSignalFeatures compute(CreditApplication app) {
        double declaredAnnual = app.getAnnualIncome() == null ? 0 : app.getAnnualIncome().doubleValue();
        double monthlyIncome = declaredAnnual / 12.0;

        Integer stmtBalance = app.getStmtAvgMonthlyBalance();
        double averageBalance = stmtBalance == null ? monthlyIncome * 0.5 : stmtBalance;

        Integer regularity = app.getCashflowSalaryRegularity();
        double incomeStability = regularity != null ? regularity
                : stabilityFallback(app.getEmploymentYears());

        Double emi = app.getRequestedEmi() == null ? null : app.getRequestedEmi().doubleValue();
        double emiBurdenRatio = (emi == null || monthlyIncome <= 0) ? 0.0 : clamp(emi / monthlyIncome, 0, 3);

        int volatility = app.getStmtExpenseVolatilityPct() == null ? 25 : app.getStmtExpenseVolatilityPct();
        int lowBalanceMonths = app.getStmtLowBalanceMonths() == null ? 0 : app.getStmtLowBalanceMonths();
        int recurringDebits = app.getStmtRecurringDebits() == null
                ? estimateRecurringObligations(app) : app.getStmtRecurringDebits();
        int suspicious = app.getStmtSuspiciousTxns() == null ? 0 : app.getStmtSuspiciousTxns();

        // Monthly surplus from the ingested statement; fall back to income-minus-EMI estimate.
        double surplus;
        if (app.getStmtMonthlySurplus() != null) {
            surplus = app.getStmtMonthlySurplus();
        } else {
            Integer avgCredit = app.getCashflowAvgMonthlyCredit();
            double emiValue = emi == null ? 0 : emi;
            surplus = avgCredit != null ? avgCredit - monthlyIncome * 0.8 : monthlyIncome - emiValue - averageBalance * 0.1;
        }

        return new BankSignalFeatures(monthlyIncome, incomeStability, averageBalance,
                emiBurdenRatio, volatility, lowBalanceMonths, recurringDebits, suspicious, surplus);
    }

    private double stabilityFallback(Integer employmentYears) {
        if (employmentYears == null) {
            return 50;
        }
        return Math.min(100, employmentYears * 12.0);
    }

    private int estimateRecurringObligations(CreditApplication app) {
        int dependents = app.getDependentsCount() == null ? 0 : app.getDependentsCount();
        return Math.min(8, 2 + dependents);
    }

    private double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
