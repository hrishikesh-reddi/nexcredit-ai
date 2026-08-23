package com.synchrony.nexcredit.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.synchrony.nexcredit.transactions.TransactionRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Live integration with Plaid Sandbox (https://sandbox.plaid.com).
 *
 * Activates only when PLAID_CLIENT_ID and PLAID_SECRET environment variables are set.
 * Until then {@link #isAvailable()} is false and the pipeline falls back to
 * {@link LocalPersonaProvider} — the rest of the system is unchanged either way.
 *
 * Flow used by the demo:
 *   1. POST /sandbox/public_token/create  -> public_token      (test Item)
 *   2. POST /item/public_token/exchange   -> access_token
 *   3. POST /transactions/get             -> transactions      (Plaid amount sign is INVERTED
 *      vs ours: their positive = outflow, so we negate to keep +in/-out convention)
 *
 * Free sandbox supports unlimited test Items with realistic personas such as
 * user_transactions_dynamic; injected transactions appear on the next pull,
 * which powers the live adverse-event recalculation in the UI.
 */
@Component
public class PlaidSandboxProvider implements FinancialDataProvider {

    static final String CLIENT_ID_ENV = "PLAID_CLIENT_ID";
    static final String SECRET_ENV = "PLAID_SECRET";

    private final String clientId;
    private final String secret;
    private final String baseUrl;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public PlaidSandboxProvider(
            @Value("${PLAID_CLIENT_ID:}") String clientId,
            @Value("${PLAID_SECRET:}") String secret,
            @Value("${nexcredit.plaid.base-url:https://sandbox.plaid.com}") String baseUrl) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.secret = secret == null ? "" : secret.trim();
        this.baseUrl = baseUrl;
    }

    @Override
    public String name() {
        return "plaid-sandbox";
    }

    @Override
    public boolean isAvailable() {
        return !clientId.isEmpty() && !secret.isEmpty();
    }

    /** Creates a sandbox Item and returns its access token (demo helper). */
    public String createSandboxAccessToken(String institutionId) throws Exception {
        Map<String, Object> body = Map.of(
                "client_id", clientId,
                "secret", secret,
                "institution_id", institutionId == null ? "ins_109508" : institutionId,
                "initial_products", List.of("transactions"));
        JsonNode resp = post("/sandbox/public_token/create", body);
        String publicToken = resp.path("public_token").asText();
        JsonNode exchanged = post("/item/public_token/exchange", Map.of(
                "client_id", clientId,
                "secret", secret,
                "public_token", publicToken));
        return exchanged.path("access_token").asText();
    }

    @Override
    public List<TransactionRecord> fetch(String accessToken, double declaredAnnualIncome) {
        if (!isAvailable()) {
            throw new IllegalStateException("Plaid credentials not configured (set PLAID_CLIENT_ID / PLAID_SECRET)");
        }
        try {
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusMonths(6).minusDays(5);
            JsonNode resp = post("/transactions/get", Map.of(
                    "client_id", clientId,
                    "secret", secret,
                    "access_token", accessToken,
                    "start_date", start.format(DateTimeFormatter.ISO_DATE),
                    "end_date", end.format(DateTimeFormatter.ISO_DATE),
                    "options", Map.of("count", 500)));
            List<TransactionRecord> out = new ArrayList<>();
            for (JsonNode t : resp.path("transactions")) {
                LocalDate date = LocalDate.parse(t.path("date").asText(), DateTimeFormatter.ISO_DATE);
                // Plaid: positive amount = money OUT. We store signed +in/-out, hence negate.
                double amount = -t.path("amount").asDouble();
                String name = t.path("name").asText("");
                String category = t.path("personal_finance_category").path("primary").asText("OTHER");
                out.add(new TransactionRecord(date, name, amount, category));
            }
            return out;
        } catch (Exception e) {
            throw new IllegalStateException("Plaid fetch failed: " + e.getMessage(), e);
        }
    }

    private JsonNode post(String path, Object body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .timeout(Duration.ofSeconds(30))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("Plaid " + path + " -> HTTP " + response.statusCode()
                    + ": " + response.body());
        }
        return mapper.readTree(response.body());
    }
}
