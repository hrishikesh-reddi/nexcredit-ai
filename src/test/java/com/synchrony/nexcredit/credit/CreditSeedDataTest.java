package com.synchrony.nexcredit.credit;

import com.synchrony.nexcredit.transactions.TransactionIngestionService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CreditSeedDataTest {

    @Test
    void seeds_five_canonical_scenarios_through_the_real_pipeline() {
        CreditApplicationRepository repository = mock(CreditApplicationRepository.class);
        TransactionIngestionService ingestion = mock(TransactionIngestionService.class);
        when(repository.count()).thenReturn(0L);
        when(repository.save(any(CreditApplication.class))).thenAnswer(invocation -> {
            CreditApplication app = invocation.getArgument(0);
            app.setId(1L);
            return app;
        });

        new CreditSeedData(repository, ingestion).seedApplications();

        ArgumentCaptor<CreditApplication> saved = ArgumentCaptor.forClass(CreditApplication.class);
        verify(repository, times(5)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(CreditApplication::getApplicantName)
                .containsExactly("Aarav Mehta", "Meera Iyer", "Vikram Rathore", "Rohan Das", "Neha Sharma");

        // Two healthy personas (Aarav + Neha), two unstable (Meera + Rohan), one suspicious (Vikram)
        verify(ingestion, times(2)).ingest(any(), anyString(), eq(TransactionIngestionService.PERSONA_HEALTHY));
        verify(ingestion, times(2)).ingest(any(), anyString(), eq(TransactionIngestionService.PERSONA_UNSTABLE));
        verify(ingestion).ingest(any(), anyString(), eq(TransactionIngestionService.PERSONA_SUSPICIOUS));
    }

    @Test
    void skips_seeding_when_data_already_exists() {
        CreditApplicationRepository repository = mock(CreditApplicationRepository.class);
        TransactionIngestionService ingestion = mock(TransactionIngestionService.class);
        when(repository.count()).thenReturn(7L);

        new CreditSeedData(repository, ingestion).seedApplications();

        verify(repository, never()).save(any(CreditApplication.class));
        verify(ingestion, never()).ingest(any(), anyString(), anyString());
    }

    @Test
    void scenario_applicants_declare_income_matching_their_persona_story() {
        CreditApplicationRepository repository = mock(CreditApplicationRepository.class);
        TransactionIngestionService ingestion = mock(TransactionIngestionService.class);
        when(repository.count()).thenReturn(0L);
        when(repository.save(any(CreditApplication.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new CreditSeedData(repository, ingestion).seedApplications();

        ArgumentCaptor<CreditApplication> saved = ArgumentCaptor.forClass(CreditApplication.class);
        verify(repository, times(5)).save(saved.capture());
        CreditApplication healthy = saved.getAllValues().get(0);
        CreditApplication unstable = saved.getAllValues().get(1);
        CreditApplication suspicious = saved.getAllValues().get(2);
        CreditApplication declined = saved.getAllValues().get(3);
        CreditApplication rescued = saved.getAllValues().get(4);

        // A: declared ~45k/month matches the healthy persona's recurring payouts (no divergence flag)
        assertThat(healthy.getAnnualIncome()).isEqualByComparingTo(new BigDecimal("540000"));
        // C: declared 83k/month is deliberately far above the persona's real salary (~48k) -> fraud divergence
        assertThat(suspicious.getAnnualIncome()).isEqualByComparingTo(new BigDecimal("1000000"));
        // D: clean decline shares no statement; E: grey-zone rescue consents to cash-flow sharing
        assertThat(declined.getCashflowShared()).isFalse();
        assertThat(rescued.getCashflowShared()).isTrue();
        // All five request a loan
        assertThat(saved.getAllValues())
                .allSatisfy(app -> assertThat(app.getRequestedAmount()).isNotNull());
    }
}
