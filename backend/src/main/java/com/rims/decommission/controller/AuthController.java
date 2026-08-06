package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.dto.LoginRequest;
import com.rims.decommission.dto.LoginResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "认证")
public class AuthController {

    @PostMapping("/login")
    @Operation(summary = "登录", description = "Mock 登录，任意密码通过，返回 JWT 占位")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        // TODO: 校验用户 + 颁发真实 JWT（JwtTokenProvider）
        String mockToken = "mock-jwt-" + req.getUsername() + "-" + System.currentTimeMillis();
        return Result.success(new LoginResponse(mockToken, 1L, req.getUsername(), req.getUsername()));
    }

    @PostMapping("/logout")
    @Operation(summary = "登出")
    public Result<Void> logout() {
        return Result.success(null, "已登出");
    }

    @GetMapping("/user-info")
    @Operation(summary = "当前用户信息+角色+菜单")
    public Result<Object> userInfo() {
        return Result.success(new Object() {
            public final String username = "demo";
            public final String[] roles = {"SUPER_ADMIN"};
            public final String[] permissions = {"*"};
        });
    }
}
