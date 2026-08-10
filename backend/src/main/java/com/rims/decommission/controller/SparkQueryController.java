package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.service.SparkQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/spark-query")
@Tag(name = "Spark 查询")
public class SparkQueryController {

    private final SparkQueryService sparkQueryService;

    public SparkQueryController(SparkQueryService sparkQueryService) {
        this.sparkQueryService = sparkQueryService;
    }

    @GetMapping("/synced-tables")
    @Operation(summary = "列出系统已同步的库表")
    public Result<List<Map<String,Object>>> syncedTables(@RequestParam String systemId) {
        return Result.success(sparkQueryService.listSyncedTables(systemId));
    }

    @PostMapping("/execute")
    @Operation(summary = "Spark 执行 SQL 查询已同步数据")
    public Result<Map<String,Object>> execute(@RequestBody Map<String,Object> body) {
        String systemId = (String) body.getOrDefault("systemId", "");
        String database = (String) body.getOrDefault("database", "");
        String sql = (String) body.getOrDefault("sql", "");
        int page = body.get("page") instanceof Number n ? n.intValue() : 1;
        int pageSize = body.get("pageSize") instanceof Number n ? n.intValue() : 10;
        try {
            return Result.success(sparkQueryService.executeQuery(systemId, database, sql, page, pageSize));
        } catch (Exception e) {
            return Result.fail(500, e.getMessage() == null ? "查询失败" : e.getMessage());
        }
    }
}
