package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/systems/{id}/schemas")
@Tag(name = "Schema Registry")
public class SchemaController {

    @GetMapping
    @Operation(summary = "获取 Schema 列表")
    public Result<List<Map<String,Object>>> list(@PathVariable Long id) {
        return Result.success(List.of());
    }

    @PostMapping("/discover")
    @Operation(summary = "自动探测源表结构")
    public Result<List<Map<String,Object>>> discover(@PathVariable Long id) {
        // TODO: 连接源库 DatabaseMetaData 探测，生成 schema_json
        return Result.success(List.of(Map.of("tableName", "CUSTOMER_ORDER", "columns", 12)));
    }

    @PostMapping
    @Operation(summary = "保存 Schema Registry")
    public Result<Map<String,Object>> save(@PathVariable Long id, @RequestBody Map<String,Object> body) {
        return Result.success(body);
    }
}
