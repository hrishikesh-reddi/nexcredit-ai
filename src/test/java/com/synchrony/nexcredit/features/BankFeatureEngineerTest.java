package com.synchrony.nexcredit.features;

import com.synchrony.nexcredit.credit.CreditApplication;
import com.synchrony.nexcredit.credit.EmploymentType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BankFeatureEngineerTest {

    private final BankFeatureEngineer engineer = new BankFeatureEngineer();

    @Test
    void computesEmiBurdenAndDefaultsFromStatementAggregates() {
        CreditApplication app = new CreditApplication();
        app.setAnnualIncome(new BigDecimal("600000"));
        app.setRequestedEmi(new BigDecimal("15000"));
        app.setStmtAvgMonthlyBalance(42000);
        app.setCashflowSalaryRegularity(80);
        app.setStmtExpenseVolatilityPct(18);
        app.setStmtLowBalanceMonths(2);
        app.setStmtRecurringDebits(3);
        app.setStmtSuspiciousTxns(0);

        BankSignalFeatures f = engineer.compute(app);

        assertEquals(50_000.0, f.monthlyIncome(), 0.01);
        assertEquals(0.30, f.emiBurdenRatio(), 0.001);
        assertEquals(42_000.0, f.averageBalance(), 0.01);
        assertEquals(80.0, f.incomeStability(), 0.01);
        assertEquals(18.0, f.expenseVolatilityPct(), 0.01);
        assertEquals(2, f.lowBalanceMonthsPerYear());
        assertEquals(3, f.recurringObligationsCount());
        assertEquals(0, f.suspiciousTxnCount());
    }

    @Test
    void fallsBackGracefullyWhenNoStatementDataShared() {
        CreditApplication app = new CreditApplication();
        app.setAnnualIncome(new BigDecimal("360000"));
        app.setEmploymentType(EmploymentType.GIG_WORKER);

        BankSignalFeatures f = engineer.compute(app);

        assertEquals(30_000.0, f.monthlyIncome(), 0.01);
        assertEquals(15_000.0, f.averageBalance(), 0.01);
        assertTrue(f.emiBurdenRatio() == 0.0);
        assertEquals(50.0, f.incomeStability(), 0.01);
        assertTrue(f.recurringObligationsCount() >= 2);
    }

    @Test
    void clampsExtremeEmiBurden() {
        CreditApplication app = new CreditApplication();
        app.setAnnualIncome(new BigDecimal("120000"));
        app.setRequestedEmi(new BigDecimal("90000"));

        BankSignalFeatures f = engineer.compute(app);

        assertEquals(3.0, f.emiBurdenRatio(), 0.001);
    }
}
