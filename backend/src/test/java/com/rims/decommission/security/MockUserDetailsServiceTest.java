package com.rims.decommission.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.assertj.core.api.Assertions.*;

class MockUserDetailsServiceTest {

    private MockUserDetailsService service;

    @BeforeEach
    void setUp() {
        service = new MockUserDetailsService(new BCryptPasswordEncoder());
    }

    @Test
    void loadUserByUsername_shouldSucceedForKnown() {
        var user = service.loadUserByUsername("sarah.chen@company.com");
        assertThat(user.getUsername()).isEqualTo("sarah.chen@company.com");
        assertThat(user.getAuthorities()).isNotEmpty();
    }

    @Test
    void checkPassword_shouldAcceptDemo1234ForAll() {
        assertThat(service.checkPassword("demo1234", "sarah.chen@company.com")).isTrue();
        assertThat(service.checkPassword("demo1234", "unknown@x.com")).isFalse(); // unknown user -> false per impl
        assertThat(service.checkPassword("wrong", "sarah.chen@company.com")).isFalse();
    }

    @Test
    void getRoles_shouldReturnSuperAdmin() {
        assertThat(service.getRoles("sarah.chen@company.com")).contains("SUPER_ADMIN");
        assertThat(service.getRoles("tom.anderson@company.com")).contains("SYSTEM_VIEWER");
    }
}
