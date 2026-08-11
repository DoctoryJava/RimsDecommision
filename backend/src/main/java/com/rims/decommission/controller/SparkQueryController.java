package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.service.AuditLogService;
import com.rims.decommission.service.SparkQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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

    /** 导出查询结果：后端直接生成 CSV 字节流返回，前端不拼接。 */
    @PostMapping("/export")
    @Operation(summary = "导出查询结果为 CSV（后端生成文件流）")
    public void export(@RequestBody Map<String,Object> body, HttpServletResponse response) throws IOException {
        String systemId = (String) body.getOrDefault("systemId", "");
        String database = (String) body.getOrDefault("database", "");
        String sql = (String) body.getOrDefault("sql", "");
        String filename = (String) body.getOrDefault("filename", "export");
        String status = "failed";
        try {
            Map<String,Object> res = sparkQueryService.exportQuery(systemId, database, sql);
            @SuppressWarnings("unchecked")
            List<String> columns = (List<String>) res.getOrDefault("columns", List.of());
            @SuppressWarnings("unchecked")
            List<Map<String,Object>> rows = (List<Map<String,Object>>) res.getOrDefault("rows", List.of());

            String safeName = filename.replaceAll("[\\\\/:*?\"<>|\\s]", "_");
            String fileName = safeName + ".csv";
            response.setContentType("text/csv;charset=UTF-8");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + URLEncoder.encode(fileName, "UTF-8"));

            Writer w = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
            // UTF-8 BOM，避免 Excel 打开中文乱码
            w.write('\uFEFF');
            w.write(joinCsv(columns));
            w.write("\r\n");
            for (Map<String,Object> row : rows) {
                List<String> cells = new ArrayList<>();
                for (String c : columns) cells.add(csvCell(row.get(c)));
                w.write(joinCsv(cells));
                w.write("\r\n");
            }
            w.flush();
            status = "success";
            auditLogService.record("query", truncate(sql), status, systemId,
                    Map.of("database", database == null ? "" : database, "export", true, "rows", rows.size()));
        } catch (Exception e) {
            auditLogService.record("query", truncate(sql), status, systemId,
                    Map.of("database", database == null ? "" : database, "export", true,
                            "error", e.getMessage() == null ? "导出失败" : e.getMessage()));
            // 已开始写流，无法再改状态码；写一行错误到 body
            response.setContentType("text/csv;charset=UTF-8");
            Writer w = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
            w.write("error," + csvCell(e.getMessage() == null ? "导出失败" : e.getMessage()));
            w.flush();
        }
    }

    private static String joinCsv(List<String> cells) {
        return String.join(",", cells);
    }

    private static String csvCell(Object v) {
        if (v == null) return "";
        String s = String.valueOf(v);
        return s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0
                ? "\"" + s.replace("\"", "\"\"") + "\"" : s;
    }

    private static String truncate(String s) {
        if (s == null) return "";
        return s.length() > 4000 ? s.substring(0, 4000) : s;
    }
}
