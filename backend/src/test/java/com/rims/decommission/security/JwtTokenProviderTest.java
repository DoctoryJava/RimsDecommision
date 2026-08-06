package com.rims.decommission.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import java.util.List;

class JwtTokenProviderTest {

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider("test-secret-32chars-min-length-123456", 3600000);
    }

    @Test
    void generateAndValidate_shouldSucceed() {
        String token = provider.generateToken("sarah.chen@company.com", List.of("SUPER_ADMIN"));
        assertThat(token).isNotBlank();
        assertThat(provider.validate(token)).isTrue();
        assertThat(provider.getUsername(token)).isEqualTo("sarah.chen@company.com");
        assertThat(provider.getRoles(token)).contains("SUPER_ADMIN");
    }

    @Test
    void validate_shouldFailForTamperedToken() {
        String token = provider.generateToken("a@b.com", List.of("VIEWER"));
        String tampered = token.substring(0, token.length()-5) + "XXXXX";
        assertThat(provider.validate(tampered)).isFalse();
    }

    @Test
    void validate_shouldFailForEmpty() {
        assertThat(provider.validate("")).isFalse();
        assertThat(provider.validate(null)).isFalse();
    }

    @Test
    void shortSecret_shouldBePadded() {
        var p = new JwtTokenProvider("short", 1000);
        String t = p.generateToken("x@y.com", List.of("VIEWER"));
        assertThat(p.validate(t)).isTrue();
    }
}
