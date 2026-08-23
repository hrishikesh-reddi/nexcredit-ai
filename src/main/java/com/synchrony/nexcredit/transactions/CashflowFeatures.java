package com.synchrony.nexcredit.transactions;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cash-flow features computed from a raw transaction stream. Every value carries a
 * human-readable derivation note so reviewers can audit how it was calculated.
 */
public class CashflowFeatures {

    private double monthlyIncomeDetected;
    private boolean salaryDetected;
    private int salaryRegularityPct;
    private int avgMonthlyCredit;
    private int avgMonthlyDebit;
    private int monthlySurplus;
    private int avgMonthlyBalance;
    private int lowBalanceDays;
    private int lowBalanceMonths;
    private int returnedPayments;
    private int expenseVolatilityPct;
    private int recurringObligationsCount;
    private int suspiciousTxnCount;
    private int transactionCount;
    private int monthsObserved;
    /** Count of recurring employer-like salary credits observed in the window. */
    private int salaryCreditCount;
    /** Slope of month-end balance as a fraction (positive = building savings). */
    private double savingsTrend;
    private final List<String> derivationNotes = new ArrayList<>();
    private final List<String> suspiciousFindings = new ArrayList<>();

    public Map<String, Object> asMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("monthlyIncomeDetected", Math.round(monthlyIncomeDetected));
        m.put("salaryDetected", salaryDetected);
        m.put("salaryRegularityPct", salaryRegularityPct);
        m.put("salaryCreditCount", salaryCreditCount);
        m.put("avgMonthlyCredit", avgMonthlyCredit);
        m.put("avgMonthlyDebit", avgMonthlyDebit);
        m.put("monthlySurplus", monthlySurplus);
        m.put("avgMonthlyBalance", avgMonthlyBalance);
        m.put("lowBalanceDays", lowBalanceDays);
        m.put("lowBalanceMonths", lowBalanceMonths);
        m.put("returnedPayments", returnedPayments);
        m.put("expenseVolatilityPct", expenseVolatilityPct);
        m.put("recurringObligationsCount", recurringObligationsCount);
        m.put("suspiciousTxnCount", suspiciousTxnCount);
        m.put("savingsTrend", Math.round(savingsTrend * 1000.0) / 1000.0);
        m.put("transactionCount", transactionCount);
        m.put("monthsObserved", monthsObserved);
        return m;
    }

    public List<String> getDerivationNotes() {
        return derivationNotes;
    }

    public List<String> getSuspiciousFindings() {
        return suspiciousFindings;
    }

    public double getMonthlyIncomeDetected() {
        return monthlyIncomeDetected;
    }

    public void setMonthlyIncomeDetected(double v) {
        this.monthlyIncomeDetected = v;
    }

    public boolean isSalaryDetected() {
        return salaryDetected;
    }

    public void setSalaryDetected(boolean v) {
        this.salaryDetected = v;
    }

    public int getSalaryRegularityPct() {
        return salaryRegularityPct;
    }

    public void setSalaryRegularityPct(int v) {
        this.salaryRegularityPct = v;
    }

    public int getAvgMonthlyCredit() {
        return avgMonthlyCredit;
    }

    public void setAvgMonthlyCredit(int v) {
        this.avgMonthlyCredit = v;
    }

    public int getAvgMonthlyDebit() {
        return avgMonthlyDebit;
    }

    public void setAvgMonthlyDebit(int v) {
        this.avgMonthlyDebit = v;
    }

    public int getMonthlySurplus() {
        return monthlySurplus;
    }

    public void setMonthlySurplus(int v) {
        this.monthlySurplus = v;
    }

    public int getAvgMonthlyBalance() {
        return avgMonthlyBalance;
    }

    public void setAvgMonthlyBalance(int v) {
        this.avgMonthlyBalance = v;
    }

    public int getLowBalanceDays() {
        return lowBalanceDays;
    }

    public void setLowBalanceDays(int v) {
        this.lowBalanceDays = v;
    }

    public int getLowBalanceMonths() {
        return lowBalanceMonths;
    }

    public void setLowBalanceMonths(int v) {
        this.lowBalanceMonths = v;
    }

    public int getReturnedPayments() {
        return returnedPayments;
    }

    public void setReturnedPayments(int v) {
        this.returnedPayments = v;
    }

    public int getExpenseVolatilityPct() {
        return expenseVolatilityPct;
    }

    public void setExpenseVolatilityPct(int v) {
        this.expenseVolatilityPct = v;
    }

    public int getRecurringObligationsCount() {
        return recurringObligationsCount;
    }

    public void setRecurringObligationsCount(int v) {
        this.recurringObligationsCount = v;
    }

    public int getSuspiciousTxnCount() {
        return suspiciousTxnCount;
    }

    public void setSuspiciousTxnCount(int v) {
        this.suspiciousTxnCount = v;
    }

    public int getTransactionCount() {
        return transactionCount;
    }

    public void setTransactionCount(int v) {
        this.transactionCount = v;
    }

    public int getMonthsObserved() {
        return monthsObserved;
    }

    public void setMonthsObserved(int v) {
        this.monthsObserved = v;
    }

    public int getSalaryCreditCount() {
        return salaryCreditCount;
    }

    public void setSalaryCreditCount(int v) {
        this.salaryCreditCount = v;
    }

    public double getSavingsTrend() {
        return savingsTrend;
    }

    public void setSavingsTrend(double v) {
        this.savingsTrend = v;
    }
}
