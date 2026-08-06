package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.mock.MockStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Tag(name = "Schema Registry")
public class SchemaController {

    @GetMapping("/systems/{id}/schemas")
    @Operation(summary = "获取 Schema 列表")
    public Result<List<Map<String,Object>>> bySystem(@PathVariable String id) {
        var list = MockStore.schemas().stream().filter(s -> id.equals(s.get("systemId")) || "all".equals(id)).collect(Collectors.toList());
        if (list.isEmpty() && MockStore.schemas().stream().anyMatch(s -> true)) {
            // if systemId not matched, return all for demo
            list = MockStore.schemas();
        }
        return Result.success(list);
    }

    @GetMapping("/schemas")
    @Operation(summary = "所有 Schema")
    public Result<List<Map<String,Object>>> all() {
        return Result.success(MockStore.schemas());
    }

    @PostMapping("/systems/{id}/schemas/discover")
    @Operation(summary = "自动探测源表结构")
    public Result<List<Map<String,Object>>> discover(@PathVariable String id) {
        return Result.success(List.of(Map.of("tableName","CUSTOMER_ORDER","columns",12,"discovered",true)));
    }

    @GetMapping("/tables")
    @Operation(summary = "物理表列表")
    public Result<List<Map<String,Object>>> tables() {
        return Result.success(MockStore.physicalTables());
    }

    @GetMapping("/tables/{name}/columns")
    public Result<List<Map<String,Object>>> columns(@PathVariable String name) {
        var t = MockStore.physicalTables().stream().filter(m -> name.equals(m.get("name"))).findFirst().orElse(null);
        if (t==null) return Result.success(List.of());
        return Result.success((List<Map<String,Object>>)t.get("columns"));
    }
}
