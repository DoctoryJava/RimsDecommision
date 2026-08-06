package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.mock.MockStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/permissions")
@Tag(name = "权限管理")
public class PermissionController {
    @GetMapping
    @Operation(summary = "权限列表")
    public Result<List<Map<String,Object>>> list() {
        return Result.success(MockStore.permissions());
    }
    @GetMapping("/grouped")
    public Result<Map<String,List<Map<String,Object>>>> grouped() {
        Map<String,List<Map<String,Object>>> g = new LinkedHashMap<>();
        for (var p: MockStore.permissions()) {
            String mod = (String)p.get("module");
            g.computeIfAbsent(mod,k->new ArrayList<>()).add(p);
        }
        return Result.success(g);
    }
}
