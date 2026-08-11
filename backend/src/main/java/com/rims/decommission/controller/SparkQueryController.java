package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.service.AuditLogService;
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
    private final AuditLogService auditLogService;

    public SparkQueryController(SparkQueryService sparkQueryService, AuditLogService auditLogService) {
        this.sparkQueryService = sparkQueryService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/synced-tables")
    @Operation(summary = "列出系统已同步的库表")
    public Result<List<Map<String,Object>>> syncedTables(@RequestParam String systemId) {
        return Result.success(sparkQueryService.listSyncedTables(systemId));
    }

    @GetMapping("/all-synced-tables")
    @Operation(summary = "列出所有已同步的库表（不按系统过滤）")
    public Result<List<Map<String,Object>>> allSyncedTables() {
        return Result.success(sparkQueryService.listAllSyncedTables());
    }

    @GetMapping("/system-schema")
    @Operation(summary = "某系统的表结构（含每张表的字段），供 Query Config 选字段")
    public Result<List<Map<String,Object>>> systemSchema(@RequestParam String systemId) {
        return Result.success(sparkQueryService.listSystemSchema(systemId));
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
            Result<Map<String,Object>> res = Result.success(sparkQueryService.executeQuery(systemId, database, sql, page, pageSize));
            auditLogService.record("query", truncate(sql), "success", systemId,
                    Map.of("database", database == null ? "" : database, "rows", 0));
            return res;
        } catch (Exception e) {
            auditLogService.record("query", truncate(sql), "failed", systemId,
                    Map.of("database", database == null ? "" : database, "error", e.getMessage() == null ? "查询失败" : e.getMessage()));
            return Result.fail(500, e.getMessage() == null ? "查询失败" : e.getMessage());
        }
    }

    private static String truncate(String s) {
        if (s == null) return "";
        return s.length() > 4000 ? s.substring(0, 4000) : s;
    }
}
