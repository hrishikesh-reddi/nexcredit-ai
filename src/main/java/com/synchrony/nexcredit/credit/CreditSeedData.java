package com.synchrony.nexcredit.credit;

import com.synchrony.nexcredit.transactions.TransactionIngestionService;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;

    /**
     * Seeds five canonical demo scenarios. Decisions are NOT hard-coded: each applicant
     * is saved with declared data only, then pushed through the real transaction-ingestion +
     * underwriting pipeline so the stored outcome is genuinely computed from raw transactions.
     *
     *   Scenario A  "Aarav Mehta"    thin-file gig worker, healthy cash-flow, partner-enriched -> APPROVED
     *   Scenario B  "Meera Iyer"     thin-file self-employed, unstable + indebted            -> MANUAL REVIEW
     *   Scenario C  "Vikram Rathore" declared income far above detected reality              -> DECLINED (fraud)
     *   Scenario D  "Rohan Das"      weak declared financials, no cash-flow save             -> DECLINED (credit)
     *   Scenario E  "Neha Sharma"    grey-zone bureau file, fully healthy consented statement-> APPROVED (cash-flow flip)
     */
    @Component
    public class CreditSeedData {

        private final CreditApplicationRepository repository;
        private final TransactionIngestionService ingestionService;

        public CreditSeedData(CreditApplicationRepository repository, TransactionIngestionService ingestionService) {
            this.repository = repository;
            this.ingestionService = ingestionService;
        }

        @PostConstruct
        public void seedApplications() {
            if (repository.count() > 0) {
                return;
            }

            // ---- Scenario A: New-to-Credit / thin-file, healthy financial behaviour ----
            CreditApplication a = base("Aarav Mehta", 24, new BigDecimal("540000"), EmploymentType.GIG_WORKER,
                    85, 80, 72);
            a.setRequestedAmount(new BigDecimal("150000"));
            a.setRequestedEmi(new BigDecimal("6500"));
            a.setDependentsCount(0);
            a.setEmploymentYears(3);
            a.setEducationLevel("HIGHER");
            a.setPartnerEnriched(true);
            a.setCashflowAvgMonthlyCredit(32000);
            a.setCashflowSalaryRegularity(92);
            a.setCashflowLowBalanceDays(3);
            a.setCashflowReturnedPayments(0);
            CreditApplication savedA = repository.save(a);
            ingestionService.ingest(savedA.getId(), "local", TransactionIngestionService.PERSONA_HEALTHY);

            // ---- Scenario B: thin-file, unstable cash flow and heavy obligations ----
            CreditApplication b = base("Meera Iyer", 29, new BigDecimal("300000"), EmploymentType.SELF_EMPLOYED,
                    58, 52, 50);
            b.setRequestedAmount(new BigDecimal("300000"));
            b.setRequestedEmi(new BigDecimal("12000"));
            b.setDependentsCount(1);
            b.setEmploymentYears(4);
            b.setEducationLevel("SECONDARY");
            b.setCashflowAvgMonthlyCredit(22000);
            b.setCashflowSalaryRegularity(40);
            b.setCashflowLowBalanceDays(10);
            b.setCashflowReturnedPayments(0);
            CreditApplication savedB = repository.save(b);
            ingestionService.ingest(savedB.getId(), "local", TransactionIngestionService.PERSONA_UNSTABLE);

            // ---- Scenario C: suspicious / inconsistent applicant ----
            CreditApplication c = base("Vikram Rathore", 38, new BigDecimal("1000000"), EmploymentType.SALARIED,
                    70, 66, 62);
            c.setRequestedAmount(new BigDecimal("800000"));
            c.setRequestedEmi(new BigDecimal("26000"));
            c.setDependentsCount(2);
            c.setEmploymentYears(9);
            c.setEducationLevel("HIGHER");
            CreditApplication savedC = repository.save(c);
            ingestionService.ingest(savedC.getId(), "local", TransactionIngestionService.PERSONA_SUSPICIOUS);

            // ---- Scenario D: clean credit decline — weak declared financials, no cash-flow rescue ----
            CreditApplication d = base("Rohan Das", 21, new BigDecimal("180000"), EmploymentType.STUDENT,
                    28, 26, 24);
            d.setRequestedAmount(new BigDecimal("250000"));
            d.setRequestedEmi(new BigDecimal("16000"));
            d.setDependentsCount(0);
            d.setEmploymentYears(1);
            d.setEducationLevel("SECONDARY");
            d.setCashflowShared(false);
            CreditApplication savedD = repository.save(d);
            ingestionService.ingest(savedD.getId(), "local", TransactionIngestionService.PERSONA_UNSTABLE);

            // ---- Scenario E: grey-zone bureau file rescued by a fully healthy consented statement ----
            CreditApplication e = base("Neha Sharma", 27, new BigDecimal("420000"), EmploymentType.SELF_EMPLOYED,
                    50, 46, 44);
            e.setRequestedAmount(new BigDecimal("150000"));
            e.setRequestedEmi(new BigDecimal("9000"));
            e.setDependentsCount(1);
            e.setEmploymentYears(3);
            e.setEducationLevel("HIGHER");
            e.setCashflowAvgMonthlyCredit(24500);
            e.setCashflowSalaryRegularity(88);
            e.setCashflowLowBalanceDays(3);
            e.setCashflowReturnedPayments(0);
            CreditApplication savedE = repository.save(e);
            ingestionService.ingest(savedE.getId(), "local", TransactionIngestionService.PERSONA_HEALTHY);
        }

        private CreditApplication base(String name, int age, BigDecimal annualIncome, EmploymentType employmentType,
                                        int mobile, int transaction, int social) {
            CreditApplication app = new CreditApplication();
            app.setApplicantName(name);
            app.setAge(age);
            app.setAnnualIncome(annualIncome);
            app.setEmploymentType(employmentType);
            app.setMobileUsageScore(mobile);
            app.setTransactionBehaviorScore(transaction);
            app.setSocialSignalScore(social);
            // Each demo applicant has consented to bank-data sharing, so the cash-flow
            // second look (PRISM-style overlay) is part of their decision, not just declared data.
            app.setCashflowShared(true);
            return app;
        }
    }
