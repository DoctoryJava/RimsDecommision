package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RRole;
import com.rims.decommission.mapper.RRoleMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roles")
@Tag(name = "角色管理")
public class RoleController {

    private final RRoleMapper mapper;

    public RoleController(RRoleMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    @Operation(summary = "角色列表（r_role 表）")
    public Result<List<Map<String,Object>>> list(@RequestParam(required=false) String category) {
        LambdaQueryWrapper<RRole> w = new LambdaQueryWrapper<>();
        if (category != null && !category.isBlank()) {
            w.eq(RRole::getCategory, category);
        }
        w.orderByAsc(RRole::getId);
        List<Map<String,Object>> list = mapper.selectList(w).stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(list);
    }

    @PostMapping
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RRole r = fromMap(body);
        if (r.getId() == null || r.getId().isBlank()) r.setId("r-" + System.currentTimeMillis());
        if (r.getIsBuiltin() == null) r.setIsBuiltin(0);
        mapper.insert(r);
        return Result.success(toMap(mapper.selectById(r.getId())));
    }

    @PutMapping("/{id}")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RRole r = fromMap(body);
        r.setId(id);
        mapper.updateById(r);
        return Result.success(toMap(mapper.selectById(id)));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        mapper.deleteById(id);
        return Result.success(null);
    }

    @PutMapping("/{id}/permissions")
    @Operation(summary = "更新角色权限")
    public Result<Map<String,Object>> updatePerms(@PathVariable String id, @RequestBody Map<String,Object> body) {
        Object perms = body.getOrDefault("permissions", List.of());
        RRole r = mapper.selectById(id);
        if (r == null) return Result.fail(404, "角色不存在");
        r.setPermissions(perms instanceof List<?> l ? castStr(l) : List.of());
        mapper.updateById(r);
        return Result.success(Map.of("roleId", id, "permissions", r.getPermissions()));
    }

    private Map<String,Object> toMap(RRole r) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("key", r.getRoleKey());
        m.put("name", r.getName());
        m.put("description", r.getDescription());
        m.put("userCount", r.getUserCount() != null ? r.getUserCount() : 0);
        m.put("permissions", r.getPermissions() != null ? r.getPermissions() : List.of());
        m.put("category", r.getCategory());
        m.put("color", r.getColor());
        m.put("isBuiltin", r.getIsBuiltin() != null && r.getIsBuiltin() == 1);
        return m;
    }

    private RRole fromMap(Map<String,Object> body) {
        RRole r = new RRole();
        r.setRoleKey(str(body.getOrDefault("key", body.get("roleKey"))));
        r.setName(str(body.get("name")));
        r.setDescription(str(body.get("description")));
        if (body.get("userCount") instanceof Number n) r.setUserCount(n.intValue());
        if (body.get("permissions") instanceof List<?> l) r.setPermissions(castStr(l));
        r.setCategory(str(body.get("category")));
        r.setColor(str(body.get("color")));
        if (body.get("isBuiltin") instanceof Boolean b) r.setIsBuiltin(b ? 1 : 0);
        return r;
    }

    @SuppressWarnings("unchecked")
    private static List<String> castStr(List<?> l) { return (List<String>) l; }
    private static String str(Object o) { return o != null ? o.toString() : null; }
}
