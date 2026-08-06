package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.mock.MockStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/roles")
@Tag(name = "角色管理")
public class RoleController {

    @GetMapping
    @Operation(summary = "角色列表")
    public Result<List<Map<String,Object>>> list(@RequestParam(required=false) String category) {
        var list = MockStore.roles();
        if (category != null && !category.isBlank()) {
            list = list.stream().filter(r -> category.equals(r.get("category"))).collect(Collectors.toList());
        }
        return Result.success(list);
    }

    @PostMapping
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        body.put("id","r-"+System.currentTimeMillis());
        return Result.success(body);
    }

    @PutMapping("/{id}")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        body.put("id", id);
        return Result.success(body);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        return Result.success(null);
    }

    @PutMapping("/{id}/permissions")
    @Operation(summary = "更新角色权限")
    public Result<Map<String,Object>> updatePerms(@PathVariable String id, @RequestBody Map<String,Object> body) {
        return Result.success(Map.of("roleId",id,"permissions",body.getOrDefault("permissions",List.of())));
    }
}
