package com.rims.decommission.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rims.decommission.config.SparkProperties;
import com.rims.decommission.entity.RSchema;
import com.rims.decommission.entity.RSyncTableStat;
import com.rims.decommission.mapper.RSchemaMapper;
import com.rims.decommission.mapper.RSyncTableStatMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.*;

/**
 * 基于 Spark 的 Iceberg 数据查询服务。
 * 通过 spark-submit 调用独立作业 {@code com.rims.spark.QueryJob}（scripts/spark/rims-spark-query.jar）
 * 执行任意 SQL（SELECT / WHERE / JOIN / 聚合），读取已同步落盘的 Iceberg 数据。
 * QueryJob 以 RESULT_ 前缀行输出列名/行 JSON/计数，本服务解析后做内存分页。
 */
@Service
public class SparkQueryService {

    private final SparkProperties props;
    private final RSyncTableStatMapper tableStatMapper;
    private final RSchemaMapper schemaMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SparkQueryService(SparkProperties props, RSyncTableStatMapper tableStatMapper, RSchemaMapper schemaMapper) {
        this.props = props;
        this.tableStatMapper = tableStatMapper;
        this.schemaMapper = schemaMapper;
    }

    /** 列出某系统已同步的表（库 -> 表列表，按 databaseName 分组）。 */
    public List<Map<String, Object>> listSyncedTables(String systemId) {
        List<RSyncTableStat> stats = tableStatMapper.selectList(
                new LambdaQueryWrapper<RSyncTableStat>()
                        .eq(RSyncTableStat::getSystemId, systemId));
        return groupTables(stats);
    }

    /** 列出所有已同步的表（不按系统过滤），供 Query Configs 选择基础表等使用。 */
    public List<Map<String, Object>> listAllSyncedTables() {
        return groupTables(tableStatMapper.selectList(null));
    }

    /** 获取某系统的表结构（含每张表的字段），供 Query Config 选字段/关联字段。 */
    public List<Map<String, Object>> listSystemSchema(String systemId) {
        List<RSchema> schemas = schemaMapper.selectList(
                new LambdaQueryWrapper<RSchema>().eq(RSchema::getSystemId, systemId));
        // 优先用已保存的表结构（含字段）
        if (!schemas.isEmpty()) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (RSchema s : schemas) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("database", s.getName());
                m.put("tables", s.getTables() != null ? s.getTables() : new ArrayList<>());
                result.add(m);
            }
            return result;
        }
        // 回退：从 r_sync_table_stat 列出已同步的表（字段留空，提示需重新同步保存结构）
        List<RSyncTableStat> stats = tableStatMapper.selectList(
                new LambdaQueryWrapper<RSyncTableStat>().eq(RSyncTableStat::getSystemId, systemId));
        Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();
        for (RSyncTableStat s : stats) {
            String db = s.getDatabaseName() == null || s.getDatabaseName().isBlank() ? "default" : s.getDatabaseName();
            if (s.getTableName() == null || s.getTableName().isBlank()) continue;
            Map<String, Object> tableDef = new LinkedHashMap<>();
            tableDef.put("name", s.getTableName());
            tableDef.put("columns", new ArrayList<>());
            grouped.computeIfAbsent(db, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("database", db);
                m.put("tables", new ArrayList<Object>());
                return m;
            });
            ((List<Object>) grouped.get(db).get("tables")).add(tableDef);
        }
        return new ArrayList<>(grouped.values());
    }

    private List<Map<String, Object>> groupTables(List<RSyncTableStat> stats) {
        Map<String, Set<String>> grouped = new LinkedHashMap<>();
        for (RSyncTableStat s : stats) {
            String db = s.getDatabaseName() == null || s.getDatabaseName().isBlank() ? "default" : s.getDatabaseName();
            if (s.getTableName() == null || s.getTableName().isBlank()) continue;
            grouped.computeIfAbsent(db, k -> new LinkedHashSet<>()).add(s.getTableName());
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (var e : grouped.entrySet()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("database", e.getKey());
            m.put("tables", new ArrayList<>(e.getValue()));
            result.add(m);
        }
        return result;
    }

    /** 通过 spark-submit + QueryJob 执行任意 SQL 查询已同步的 Iceberg 数据，结果内存分页。 */
    public Map<String, Object> executeQuery(String systemId, String database, String sql, int page, int pageSize) {
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            if (sql == null || sql.isBlank()) {
                result.put("columns", List.of());
                result.put("rows", List.of());
                result.put("total", 0);
                return result;
            }
            if (!props.isEnabled()) {
                return simulate(sql, page, pageSize);
            }
            String log = runSparkSql(sql);
            ParsedResult parsed = parseResult(log);
            if (parsed.error != null) {
                throw new IllegalStateException(parsed.error);
            }
            List<Map<String, Object>> all = parsed.rows;
            int total = all.size();
            int from = Math.min((page - 1) * pageSize, total);
            int to = Math.min(from + pageSize, total);
            List<Map<String, Object>> pageRows = from >= to ? List.of() : all.subList(from, to);
            result.put("columns", parsed.columns);
            result.put("rows", pageRows);
            result.put("total", total);
        } catch (Exception e) {
            throw new IllegalStateException("Spark 查询失败：" + (e.getMessage() == null ? "" : e.getMessage()), e);
        }
        return result;
    }

    /**
     * 调用 spark-submit 运行 QueryJob，返回合并 stdout（含 RESULT_ 前缀行 + Spark 日志）。
     * 子进程 JDK 隔离为 ≤11（Spark 3.3 限制），后端自身仍跑 17+。
     */
    private String runSparkSql(String sql) throws Exception {
        String sparkSubmit = Paths.get(props.getHome(), "bin", "spark-submit").toString();
        ProcessBuilder pb = new ProcessBuilder(
                sparkSubmit,
                "--master", "local[1]",
                "--driver-memory", "1g",
                "--jars", props.getIcebergJar(),
                "--class", "com.rims.spark.QueryJob",
                props.getQueryJobJar(),
                props.getWarehouseDir(),
                props.getCatalogName(),
                sql);
        pb.environment().put("SPARK_HOME", props.getHome());
        // Spark 3.3 仅支持 JDK ≤11，而后端运行于 17+；隔离子进程 JDK
        String javaHome = props.getJavaHome();
        if (javaHome != null && !javaHome.isBlank()) pb.environment().put("JAVA_HOME", javaHome);
        pb.redirectErrorStream(true);
        Process p = pb.start();
        StringBuilder out = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) out.append(line).append('\n');
        }
        int exit = p.waitFor();
        String log = out.toString();
        // 若 QueryJob 已输出 RESULT_ERROR，异常细节由 parseResult 提取；
        // 仅在无任何 RESULT_ 输出（如 spark-submit 自身失败）时按退出码报错
        if (exit != 0 && !log.contains("RESULT_")) {
            throw new IllegalStateException("spark-submit 退出码 " + exit + ":\n" + tail(log, 40));
        }
        return log;
    }

    /** 解析 QueryJob 输出的 RESULT_ 前缀行为列名、行 Map、错误信息。 */
    @SuppressWarnings("unchecked")
    private ParsedResult parseResult(String log) {
        ParsedResult pr = new ParsedResult();
        for (String line : log.split("\n")) {
            if (line.startsWith("RESULT_ERROR:")) {
                pr.error = line.substring("RESULT_ERROR:".length()).trim();
            } else if (line.startsWith("RESULT_COLUMNS:")) {
                String cols = line.substring("RESULT_COLUMNS:".length());
                for (String c : cols.split("\t")) {
                    String t = c.trim();
                    if (!t.isEmpty()) pr.columns.add(t);
                }
            } else if (line.startsWith("RESULT_ROW:")) {
                String json = line.substring("RESULT_ROW:".length()).trim();
                try {
                    pr.rows.add(objectMapper.readValue(json, Map.class));
                } catch (Exception ignored) {
                }
            }
        }
        return pr;
    }

    private static class ParsedResult {
        List<String> columns = new ArrayList<>();
        List<Map<String, Object>> rows = new ArrayList<>();
        String error = null;
    }

    private String tail(String s, int n) {
        String[] lines = s.split("\n");
        StringBuilder sb = new StringBuilder();
        int start = Math.max(0, lines.length - n);
        for (int i = start; i < lines.length; i++) sb.append(lines[i]).append('\n');
        return sb.toString();
    }

    /** 模拟返回（SPARK_QUERY_ENABLED=false 调试用）。 */
    private Map<String, Object> simulate(String sql, int page, int pageSize) {
        List<Map<String, Object>> all = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", i + 1);
            r.put("name", "模拟行 " + (i + 1));
            r.put("note", "(模拟模式) " + sql);
            all.add(r);
        }
        int total = all.size();
        int from = Math.min((page - 1) * pageSize, total);
        int to = Math.min(from + pageSize, total);
        List<String> columns = List.of("id", "name", "note");
        return Map.of("columns", columns, "rows", from >= to ? List.of() : all.subList(from, to), "total", total);
    }
}
