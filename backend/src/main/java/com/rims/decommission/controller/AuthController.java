package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.dto.LoginRequest;
import com.rims.decommission.dto.LoginResponse;
import com.rims.decommission.entity.RUser;
import com.rims.decommission.security.DbUserDetailsService;
import com.rims.decommission.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "认证")
public class AuthController {

    private final JwtTokenProvider jwt;
    private final DbUserDetailsService userService;

    public AuthController(JwtTokenProvider jwt, DbUserDetailsService userService) {
        this.jwt = jwt;
        this.userService = userService;
    }

    @PostMapping("/login")
    @Operation(summary = "登录", description = "基于 r_user 表校验邮箱+密码，颁发 JWT")
    public Result<LoginResponse> login(@RequestBody LoginRequest req) {
        String username = req.getUsername();
        if (username == null || username.isBlank()) {
            return Result.fail(400, "用户名不能为空");
        }
        RUser user = userService.findByEmail(username);
        if (user == null || !userService.checkPassword(req.getPassword(), username)) {
            return Result.fail(401, "用户名或密码错误");
        }
        if ("disabled".equalsIgnoreCase(user.getStatus())) {
            return Result.fail(403, "账号已禁用");
        }
        List<String> roles = userService.getRoles(username);
        String token = jwt.generateToken(user.getEmail().toLowerCase(), roles);
        long userId = Math.abs(user.getEmail().hashCode());
        String realName = user.getName() != null ? user.getName() : (user.getEmail().split("@")[0]);
        return Result.success(new LoginResponse(token, userId, user.getEmail(), realName));
    }

    @PostMapping("/logout")
    @Operation(summary = "登出")
    public Result<Void> logout() {
        return Result.success(null, "已登出");
    }

    @GetMapping("/user-info")
    @Operation(summary = "当前用户信息+角色+菜单")
    public Result<Map<String,Object>> userInfo(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return Result.fail(401, "未认证");
        }
        String username;
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) {
            username = ud.getUsername();
        } else {
            username = auth.getName();
        }
        List<String> roles = auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .toList();
        if (roles.isEmpty()) roles = userService.getRoles(username);
        List<String> permissions = roles.contains("SUPER_ADMIN") ? List.of("*") : List.of("systems.view","data.view");
        RUser user = userService.findByEmail(username);
        String displayName = username.contains("@") ? username.split("@")[0] : username;
        if (user != null && user.getName() != null) displayName = user.getName();
        Map<String,Object> data = Map.<String,Object>of(
                "username", displayName,
                "email", username,
                "roles", roles,
                "permissions", permissions
        );
        return Result.success(data);
    }
}
