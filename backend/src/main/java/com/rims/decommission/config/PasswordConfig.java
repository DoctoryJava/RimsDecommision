package com.rims.decommission.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 独立于 SecurityConfig 的 PasswordEncoder Bean。
 * 避免循环依赖：
 * SecurityConfig -> JwtAuthenticationFilter -> DbUserDetailsService -> PasswordEncoder
 * 若 PasswordEncoder 定义在 SecurityConfig 内会形成环。
 */
@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
