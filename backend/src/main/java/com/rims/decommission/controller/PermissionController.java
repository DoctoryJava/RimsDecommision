package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RPermission;
import com.rims.decommission.mapper.RPermissionMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/permissions")
@Tag(name = "权限管理")
public class PermissionController {

    private final RPermissionMapper mapper;

    public PermissionController(RPermissionMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    @Operation(summary = "权限列表（r_permission 表）")
    public Result<List<Map<String,Object>>> list() {
        List<Map<String,Object>> list = mapper.selectList(new LambdaQueryWrapper<RPermission>().orderByAsc(RPermission::getId))
                .stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(list);
    }

    @GetMapping("/grouped")
    public Result<Map<String,List<Map<String,Object>>>> grouped() {
        Map<String,List<Map<String,Object>>> g = new LinkedHashMap<>();
        for (var p: mapper.selectList(null)) {
            String mod = p.getModule();
            g.computeIfAbsent(mod, k->new ArrayList<>()).add(toMap(p));
        }
        return Result.success(g);
    }

    private Map<String,Object> toMap(RPermission p) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("code", p.getCode());
        m.put("name", p.getName());
        m.put("description", p.getDescription() != null ? p.getDescription() : p.getName());
        m.put("module", p.getModule());
        m.put("action", p.getAction());
        m.put("category", p.getCategory());
        return m;
    }
}
