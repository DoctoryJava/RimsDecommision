package com.rims.decommission.security;

import com.rims.decommission.entity.RUser;
import com.rims.decommission.mapper.RUserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 基于 r_user 表的真实用户认证（替代 MockUserDetailsService）。
 * 密码通过 BCrypt 校验；登录账号为邮箱。
 */
@Service
public class DbUserDetailsService implements UserDetailsService {

    private final RUserMapper userMapper;
    private final PasswordEncoder encoder;

    public DbUserDetailsService(RUserMapper userMapper, PasswordEncoder encoder) {
        this.userMapper = userMapper;
        this.encoder = encoder;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        RUser u = findByEmail(username);
        if (u == null) {
            throw new UsernameNotFoundException("User not found: " + username);
        }
        return new User(u.getEmail(), u.getPassword(), authorities(u.getRoleCode()));
    }

    /** 根据邮箱（登录名）查询用户。 */
    public RUser findByEmail(String email) {
        if (email == null || email.isBlank()) return null;
        return userMapper.selectOne(new LambdaQueryWrapper<RUser>().eq(RUser::getEmail, email.trim().toLowerCase()));
    }

    /** 返回角色编码列表（大写，去掉 ROLE_ 前缀）。 */
    public List<String> getRoles(String username) {
        RUser u = findByEmail(username);
        if (u == null) return List.of("SYSTEM_VIEWER");
        return List.of(toRoleCode(u.getRoleCode()));
    }

    public boolean checkPassword(String raw, String username) {
        RUser u = findByEmail(username);
        if (u == null) return false;
        if (u.getPassword() == null) return false;
        return encoder.matches(raw, u.getPassword());
    }

    private static String toRoleCode(String roleKey) {
        if (roleKey == null) return "SYSTEM_VIEWER";
        return roleKey.toUpperCase().replace("-", "_");
    }

    private static List<SimpleGrantedAuthority> authorities(String roleKey) {
        return List.of(new SimpleGrantedAuthority("ROLE_" + toRoleCode(roleKey)));
    }
}
