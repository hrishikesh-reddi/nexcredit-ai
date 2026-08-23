package com.synchrony.nexcredit.integration;

public class IntegrationStatus {
    public boolean connected;
    public String note;

    public IntegrationStatus(boolean connected, String note) {
        this.connected = connected;
        this.note = note;
    }
}
