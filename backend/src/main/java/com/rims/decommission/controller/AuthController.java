package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.dto.LoginRequest;
import com.rims.decommission.dto.LoginResponse;
import com.rims.decommission.security.JwtTokenProvider;
import com.rims.decommission.security.MockUserDetailsService;
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
    private final MockUserDetailsService userService;

    public AuthController(JwtTokenProvider jwt, MockUserDetailsService userService) {
        this.jwt = jwt;
        this.userService = userService;
    }

    @PostMapping("/login")
    @Operation(summary = "登录", description = "校验 mock 用户 demo1234，颁发 JWT")
    public Result<LoginResponse> login(@RequestBody LoginRequest req) {
        String username = req.getUsername();
        if (username == null || username.isBlank()) {
            return Result.fail(400, "用户名不能为空");
        }
        if (req.getPassword() == null || !userService.checkPassword(req.getPassword(), username)) {
            return Result.fail(401, "用户名或密码错误");
        }
        List<String> roles = userService.getRoles(username);
        String token = jwt.generateToken(username.toLowerCase(), roles);
        long userId = Math.abs((long) username.hashCode());
        String realName = username.contains("@") ? username.split("@")[0] : username;
        return Result.success(new LoginResponse(token, userId, username, realName));
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
        Map<String,Object> data = Map.of(
                "username", username.contains("@") ? username.split("@")[0] : username,
                "email", username,
                "roles", roles,
                "permissions", permissions
        );
        return Result.success(data);
    }
}
