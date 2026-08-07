package com.rims.decommission.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RUser;
import com.rims.decommission.service.RUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@Tag(name = "用户管理")
public class UserController {

    private final RUserService service;

    public UserController(RUserService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "用户列表（r_user 表）")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue="1") int pageNum,
            @RequestParam(defaultValue="20") int pageSize,
            @RequestParam(required=false) String search,
            @RequestParam(required=false) String role) {
        Page<RUser> p = new Page<>(pageNum, pageSize);
        var ipage = service.page(p, search, role);
        List<Map<String,Object>> list = ipage.getRecords().stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(PageResult.of(ipage.getTotal(), list, pageNum, pageSize));
    }

    @GetMapping("/{id}")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        RUser u = service.getById(id);
        if (u == null) return Result.fail(404, "用户不存在");
        return Result.success(toMap(u));
    }

    @PostMapping
    @Operation(summary = "创建用户")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RUser u = service.create(fromMap(body));
        return Result.success(toMap(u));
    }

    @PutMapping("/{id}")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RUser u = service.update(id, fromMap(body));
        return Result.success(toMap(u));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        service.delete(id);
        return Result.success(null);
    }

    private Map<String,Object> toMap(RUser u) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        m.put("avatar", u.getAvatar());
        m.put("role", u.getRoleCode());
        m.put("category", u.getCategory());
        m.put("systemIds", u.getSystemIds() != null ? u.getSystemIds() : List.of());
        m.put("status", u.getStatus());
        m.put("lastLogin", u.getLastLogin() != null ? u.getLastLogin().toString() : null);
        m.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        return m;
    }

    private RUser fromMap(Map<String,Object> body) {
        RUser u = new RUser();
        if (body.get("id") != null) u.setId(body.get("id").toString());
        u.setName(str(body.get("name")));
        u.setEmail(str(body.get("email")));
        u.setPassword(str(body.get("password")));
        u.setAvatar(str(body.get("avatar")));
        u.setRoleCode(str(body.getOrDefault("role", body.get("roleCode"))));
        u.setCategory(str(body.get("category")));
        if (body.get("systemIds") instanceof List<?> l) { @SuppressWarnings("unchecked") List<String> s = (List<String>) l; u.setSystemIds(s); }
        u.setStatus(str(body.get("status")));
        return u;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
