package com.synchrony.nexcredit.ai;

import com.synchrony.nexcredit.credit.CreditApplication;
import com.synchrony.nexcredit.credit.EmploymentType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MlRiskModelTest {

    private MlRiskModel trainedModel() {
        AiProperties props = mock(AiProperties.class);
        when(props.isMlEnabled()).thenReturn(true);
        MlRiskModel model = new MlRiskModel(props);
        model.train();
        return model;
    }

    private CreditApplication strong() {
        CreditApplication app = new CreditApplication();
        app.setAge(30);
        app.setAnnualIncome(BigDecimal.valueOf(600000));
        app.setEmploymentType(EmploymentType.SALARIED);
        app.setRequestedAmount(BigDecimal.valueOf(150000));
        app.setRequestedEmi(BigDecimal.valueOf(6000));
        app.setEmploymentYears(8);
        app.setEducationLevel("HIGHER");
        app.setMobileUsageScore(88);
        app.setTransactionBehaviorScore(82);
        app.setSocialSignalScore(70);
        return app;
    }

    private CreditApplication weak() {
        CreditApplication app = new CreditApplication();
        app.setAge(40);
        app.setAnnualIncome(BigDecimal.valueOf(60000));
        app.setEmploymentType(EmploymentType.STUDENT);
        app.setRequestedAmount(BigDecimal.valueOf(200000));
        app.setRequestedEmi(BigDecimal.valueOf(8000));
        app.setDependentsCount(3);
        app.setEmploymentYears(0);
        app.setEducationLevel("LOWER_SECONDARY");
        app.setMobileUsageScore(8);
        app.setTransactionBehaviorScore(10);
        app.setSocialSignalScore(12);
        return app;
    }

    @Test
    void trains_and_becomes_available() {
        assertThat(trainedModel().isAvailable()).isTrue();
    }

    @Test
    void strong_profile_scores_high() {
        MlRiskModel model = trainedModel();
        assertThat(model.predictProbability(strong())).isGreaterThan(0.7);
        assertThat(model.riskBand(model.predictProbability(strong()))).isEqualTo("LOW");
    }

    @Test
    void weak_profile_scores_low() {
        MlRiskModel model = trainedModel();
        assertThat(model.predictProbability(weak())).isLessThan(0.3);
        assertThat(model.riskBand(model.predictProbability(weak()))).isEqualTo("HIGH");
    }

    @Test
    void produces_feature_contributions() {
        MlRiskModel model = trainedModel();
        assertThat(model.contributions(strong())).isNotEmpty();
    }

    @Test
    void behavioural_signals_discriminate_identical_financials() {
        MlRiskModel model = trainedModel();
        CreditApplication healthy = strong();
        CreditApplication degraded = strong();
        degraded.setMobileUsageScore(8);
        degraded.setTransactionBehaviorScore(10);
        degraded.setSocialSignalScore(12);

        double pdHealthy = model.pdProbability(healthy);
        double pdDegraded = model.pdProbability(degraded);

        assertThat(pdDegraded - pdHealthy).isGreaterThan(0.25);
        assertThat(model.riskBand(model.predictProbability(degraded))).isEqualTo("HIGH");
        assertThat(model.riskBand(model.predictProbability(healthy))).isEqualTo("LOW");
    }

    @Test
    void age_is_not_an_ml_feature() throws Exception {
        java.lang.reflect.Field field = MlRiskModel.class.getDeclaredField("FEATURES");
        field.setAccessible(true);
        String[] features = (String[]) field.get(null);
        assertThat(features).doesNotContain("age");

        MlRiskModel model = trainedModel();
        assertThat(model.contributions(strong())).doesNotContainKey("age");
    }
}
