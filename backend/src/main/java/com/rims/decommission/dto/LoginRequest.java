package com.rims.decommission.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String username;
    private String email;
    private String password;

    public String getUsername() {
        if (username != null && !username.isBlank()) return username;
        return email;
    }
}
