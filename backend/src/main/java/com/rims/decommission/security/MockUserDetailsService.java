package com.rims.decommission.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

/**
 * Mock user store aligned with frontend mockData.ts (8 users).
 * Password for all: demo1234 (BCrypt). In production replace with DB lookup via SysUser mapper.
 */
@Service
public class MockUserDetailsService implements UserDetailsService {

    private final PasswordEncoder encoder;
    private final Map<String, UserDetails> users;

    public MockUserDetailsService(PasswordEncoder encoder) {
        this.encoder = encoder;
        String enc = encoder.encode("demo1234");
        this.users = Map.of(
                "sarah.chen@company.com", mock("sarah.chen@company.com", enc, List.of("SUPER_ADMIN")),
                "robert.kim@company.com", mock("robert.kim@company.com", enc, List.of("PLATFORM_ADMIN")),
                "emily.davis@company.com", mock("emily.davis@company.com", enc, List.of("SECURITY_ADMIN")),
                "marcus.wong@company.com", mock("marcus.wong@company.com", enc, List.of("SYSTEM_OWNER")),
                "priya.patel@company.com", mock("priya.patel@company.com", enc, List.of("SYSTEM_ENGINEER")),
                "james.liu@company.com", mock("james.liu@company.com", enc, List.of("SYSTEM_ENGINEER")),
                "diana.ruiz@company.com", mock("diana.ruiz@company.com", enc, List.of("SYSTEM_AUDITOR")),
                "tom.anderson@company.com", mock("tom.anderson@company.com", enc, List.of("SYSTEM_VIEWER"))
        );
    }

    private UserDetails mock(String username, String encPwd, List<String> roles) {
        return new User(username, encPwd,
                roles.stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList());
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var u = users.get(username.toLowerCase());
        if (u == null) throw new UsernameNotFoundException("User not found: " + username);
        return u;
    }

    public List<String> getRoles(String username) {
        var u = users.get(username.toLowerCase());
        if (u == null) return List.of("SYSTEM_VIEWER");
        return u.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .toList();
    }

    public boolean checkPassword(String raw, String username) {
        var u = users.get(username.toLowerCase());
        if (u == null) return false;
        // demo1234 is allowed for all mock users even if BCrypt mismatches due to random salt
        if ("demo1234".equals(raw)) return true;
        return encoder.matches(raw, u.getPassword());
    }
}
