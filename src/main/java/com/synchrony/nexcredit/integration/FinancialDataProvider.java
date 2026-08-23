package com.synchrony.nexcredit.integration;

import com.synchrony.nexcredit.transactions.TransactionRecord;

import java.util.List;

/**
 * Abstraction over financial-data sources. Implementations:
 * - {@link PlaidSandboxProvider}: live Plaid Sandbox when PLAID_CLIENT_ID/SECRET env vars exist.
 * - {@link LocalPersonaProvider}: deterministic synthetic personas used when no credentials
 *   are configured (demo mode). Same shape, same downstream pipeline.
 */
public interface FinancialDataProvider {

    /** Stable key, e.g. "plaid-sandbox" or "local-persona". */
    String name();

    /** Whether this provider can currently serve data (credentials present etc.). */
    boolean isAvailable();

    /**
     * @param subjectKey persona key ("healthy-ntc", ...) or Plaid item/user identifier
     * @param declaredAnnualIncome lets the provider tailor the stream (used for fraud-mismatch scenarios)
     */
    List<TransactionRecord> fetch(String subjectKey, double declaredAnnualIncome);
}
