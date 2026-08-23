package com.synchrony.nexcredit.security;

public record AuthResponse(String token, String username, java.util.List<String> roles) {
}
