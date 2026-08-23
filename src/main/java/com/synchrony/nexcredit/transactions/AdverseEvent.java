package com.synchrony.nexcredit.transactions;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Catalog of realistic adverse financial events used in the live "what-if" demo.
 * Each event defines raw transactions injected into the applicant's stream; every
 * downstream number (features, PD, decision) is then recomputed from data.
 */
public final class AdverseEvent {

    @FunctionalInterface
    private interface Injector {
        void add(List<TransactionRecord> out, LocalDate today, double monthlyIncome);
    }

    private static final String GAMBLING = "GAMBLING_SPIKE";
    private static final String CASH_OUT = "POST_SALARY_CASH_OUT";
    private static final String NEW_EMI = "NEW_EMI_BURDEN";
    private static final String TRANSFER_BURST = "ROUND_TRANSFER_BURST";

    private final String kind;
    private final String description;
    private final Injector injector;

    private AdverseEvent(String kind, String description, Injector injector) {
        this.kind = kind;
        this.description = description;
        this.injector = injector;
    }

    public static List<AdverseEvent> all() {
        return List.of(
                new AdverseEvent(GAMBLING,
                        "Large gambling-platform wallet loads appear in the statement window",
                        (out, today, income) -> {
                            int stake = (int) Math.max(12_000, income * 0.35);
                            out.add(new TransactionRecord(today.minusDays(9), "RUMMY CIRCLE GAME WALLET LOAD", -stake, "GAMBLING"));
                            out.add(new TransactionRecord(today.minusDays(4), "RUMMY CIRCLE GAME WALLET LOAD", -Math.round(stake * 0.6), "GAMBLING"));
                            // Deliberately below the confirmed-fraud threshold (suspicious >= 3):
                            // one spike must REFER the case to a human underwriter (PRISM-style
                            // hard-no -> refer), while repeated spikes escalate to a decline.
                        }),
                new AdverseEvent(CASH_OUT,
                        "Most of the salary is withdrawn as cash within 2 days of credit",
                        (out, today, income) -> out.add(new TransactionRecord(
                                today.withDayOfMonth(Math.max(2, today.lengthOfMonth() > 2 ? 2 : 1)),
                                "ATM CASH WITHDRAWAL", -Math.round(income * 0.6 / 100) * 100, "CASH"))),
                new AdverseEvent(NEW_EMI,
                        "A new fixed EMI obligation starts, raising debt-service burden",
                        (out, today, income) -> {
                            int emi = (int) Math.max(8_000, Math.round(income * 0.22 / 100.0) * 100);
                            // Appears in the three most recent monthly windows so the
                            // recurring-obligation detector picks it up as a real commitment.
                            out.add(new TransactionRecord(today.minusDays(5), "EMI BAJAJ FIN NEW PERSONAL LOAN", -emi, "EMI"));
                            out.add(new TransactionRecord(today.minusMonths(1).withDayOfMonth(
                                    Math.min(6, today.minusMonths(1).lengthOfMonth())), "EMI BAJAJ FIN NEW PERSONAL LOAN", -emi, "EMI"));
                            out.add(new TransactionRecord(today.minusMonths(2).withDayOfMonth(
                                    Math.min(6, today.minusMonths(2).lengthOfMonth())), "EMI BAJAJ FIN NEW PERSONAL LOAN", -emi, "EMI"));
                        }),
                new AdverseEvent(TRANSFER_BURST,
                        "Burst of identical round-figure transfers to personal accounts",
                        (out, today, income) -> {
                            int amount = (int) Math.max(30_000, Math.round(income / 1000.0) * 1000);
                            for (int i = 0; i < 3; i++) {
                                out.add(new TransactionRecord(today.minusDays(3), "UPI/P2P TRANSFER TO ASSOCIATE-" + (char) ('A' + i),
                                        -amount, "TRANSFER"));
                            }
                        }));
    }

    public static AdverseEvent byKind(String kind) {
        for (AdverseEvent e : all()) {
            if (e.kind.equalsIgnoreCase(kind)) {
                return e;
            }
        }
        return null;
    }

    public static String validKinds() {
        return String.join(", ", Arrays.stream(allArray()).map(AdverseEvent::kind).toArray(String[]::new));
    }

    private static AdverseEvent[] allArray() {
        return all().toArray(new AdverseEvent[0]);
    }

    /** Returns the stream with this event's transactions appended. */
    public List<TransactionRecord> injectInto(List<TransactionRecord> stream, LocalDate today, double monthlyIncome) {
        List<TransactionRecord> out = new ArrayList<>(stream);
        injector.add(out, today, monthlyIncome);
        return out;
    }

    /** Number of transactions this event would add (for logging/response). */
    public int transactionCount(double monthlyIncome) {
        List<TransactionRecord> probe = new ArrayList<>();
        injector.add(probe, LocalDate.now(), monthlyIncome);
        return probe.size();
    }

    public String kind() {
        return kind;
    }

    public String description() {
        return description;
    }
}
