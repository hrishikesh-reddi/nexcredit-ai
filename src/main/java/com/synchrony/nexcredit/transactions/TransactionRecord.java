package com.synchrony.nexcredit.transactions;

import java.time.LocalDate;

/**
 * A single signed financial transaction from any connected source.
 * Positive amount = money in (credit); negative = money out (debit).
 */
public class TransactionRecord {

    private final LocalDate date;
    private final String description;
    private final double amount;
    private final String category;
    /** Running account balance after this transaction, when the source provides it (nullable). */
    private final Double balanceAfter;

    public TransactionRecord(LocalDate date, String description, double amount, String category) {
        this(date, description, amount, category, null);
    }

    public TransactionRecord(LocalDate date, String description, double amount, String category, Double balanceAfter) {
        this.date = date;
        this.description = description == null ? "" : description;
        this.amount = amount;
        this.category = category == null ? "OTHER" : category;
        this.balanceAfter = balanceAfter;
    }

    public boolean isCredit() {
        return amount > 0;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof TransactionRecord)) {
            return false;
        }
        TransactionRecord that = (TransactionRecord) o;
        return java.lang.Double.compare(amount, that.amount) == 0
                && date.equals(that.date)
                && description.equals(that.description)
                && category.equals(that.category)
                && (balanceAfter == null ? that.balanceAfter == null
                        : that.balanceAfter != null && Math.abs(balanceAfter - that.balanceAfter) < 0.005);
    }

    @Override
    public int hashCode() {
        int result = date.hashCode();
        result = 31 * result + description.hashCode();
        result = 31 * result + Double.hashCode(Math.round(amount * 100) / 100.0);
        result = 31 * result + category.hashCode();
        return result;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getDescription() {
        return description;
    }

    public double getAmount() {
        return amount;
    }

    public String getCategory() {
        return category;
    }

    public Double getBalanceAfter() {
        return balanceAfter;
    }
}
