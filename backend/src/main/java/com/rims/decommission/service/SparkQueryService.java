package com.rims.decommission.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rims.decommission.config.SparkProperties;
import com.rims.decommission.entity.RSyncTableStat;
import com.rims.decommission.mapper.RSyncTableStatMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/**
 * 基于 Spark 的 Iceberg 数据查询服务。
 * 读取已同步落盘的 Iceberg 数据（通过 spark-submit 执行 PySpark 脚本）。
 */
@Service
public class SparkQueryService {

    private final SparkProperties props;
    private final RSyncTableStatMapper tableStatMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SparkQueryService(SparkProperties props, RSyncTableStatMapper tableStatMapper) {
        this.props = props;
        this.tableStatMapper = tableStatMapper;
    }

    /** 列出某系统已同步的表（库 -> 表列表，按 databaseName 分组）。 */
    public List<Map<String, Object>> listSyncedTables(String systemId) {
        // 直接查该系统全部表统计记录，内存去重分组（避免 groupBy 差异）
        List<RSyncTableStat> stats = tableStatMapper.selectList(
                new LambdaQueryWrapper<RSyncTableStat>()
                        .eq(RSyncTableStat::getSystemId, systemId));
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

    /** 通过 Spark 执行 SQL 查询已同步的 Iceberg 数据。 */
    public Map<String, Object> executeQuery(String systemId, String database, String sql, int page, int pageSize) {
        Map<String, Object> result = new LinkedHashMap<>();
        try {
            // SQL 空则返回空
            if (sql == null || sql.isBlank()) {
                result.put("columns", List.of());
                result.put("rows", List.of());
                result.put("total", 0);
                return result;
            }
            if (!props.isEnabled()) {
                return simulate(sql, page, pageSize);
            }
            // 用 SeaTunnel Spark 引擎查询（Iceberg source -> Console sink），
            // warehouse 指向该库目录 {warehouse}/{db}，避开 PySpark 的 Python 兼容问题。
            String confFile = writeConf(database, sql);
            String log = runSeaTunnelSpark(confFile);
            List<Map<String, Object>> all = parseConsoleResult(log);
            int total = all.size();
            int from = Math.min((page - 1) * pageSize, total);
            int to = Math.min(from + pageSize, total);
            List<Map<String, Object>> pageRows = from >= to ? List.of() : all.subList(from, to);
            List<String> columns = new ArrayList<>();
            if (!all.isEmpty()) columns.addAll(all.get(0).keySet());
            result.put("columns", columns);
            result.put("rows", pageRows);
            result.put("total", total);
        } catch (Exception e) {
            throw new IllegalStateException("Spark 查询失败：" + (e.getMessage() == null ? "" : e.getMessage()), e);
        }
        return result;
    }

    /** 生成 SeaTunnel conf：Iceberg source（读已同步表）+ Console sink。 */
    private String writeConf(String database, String sql) throws IOException {
        String dbName = database == null || database.isBlank() ? "" : database;
        String warehouse = props.getWarehouseDir();
        if (!dbName.isEmpty()) {
            warehouse = warehouse + "/" + dbName;
        }
        // 用查询语句作为 Iceberg source 的 query（表名需为 namespace.table，如 archive.l_organization）
        String query = sql.replace("\"", "\\\"").replace("\n", " ");
        String conf = "env {\n"
                + "  parallelism = 1\n"
                + "  job.mode = \"BATCH\"\n"
                + "  spark.app.name = \"rims_query\"\n"
                + "  spark.master = \"local[1]\"\n"
                + "}\n"
                + "source {\n"
                + "  Iceberg {\n"
                + "    catalog_name = \"seatunnel\"\n"
                + "    iceberg.catalog.config = {\n"
                + "      type = \"hadoop\"\n"
                + "      warehouse = \"file://" + warehouse + "\"\n"
                + "    }\n"
                + "    query = \"" + query + "\"\n"
                + "    plugin_output = \"iceberg\"\n"
                + "  }\n"
                + "}\n"
                + "transform {\n}\n"
                + "sink {\n"
                + "  Console {\n"
                + "    plugin_input = \"iceberg\"\n"
                + "  }\n"
                + "}\n";
        Files.createDirectories(Paths.get(System.getProperty("java.io.tmpdir"), "rims_spark"));
        Path p = Paths.get(System.getProperty("java.io.tmpdir"), "rims_spark", "query_" + System.currentTimeMillis() + ".conf");
        Files.writeString(p, conf, StandardCharsets.UTF_8);
        return p.toString();
    }

    /** 用 SeaTunnel Spark 引擎执行查询 conf，返回 Console 输出日志。 */
    private String runSeaTunnelSpark(String confFile) throws Exception {
        String script = props.getSeatunnelHome() + "/bin/start-seatunnel-spark-3-connector-v2.sh";
        ProcessBuilder pb = new ProcessBuilder(
                script,
                "--master", "local[1]",
                "--deploy-mode", "client",
                "--config", confFile);
        // 保证 SeaTunnel 能找到 SPARK_HOME
        pb.environment().put("SPARK_HOME", props.getHome());
        pb.directory(java.nio.file.Paths.get(props.getSeatunnelHome()).toFile());
        pb.redirectErrorStream(true);
        Process p = pb.start();
        StringBuilder out = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) {
                out.append(line).append('\n');
            }
        }
        int exit = p.waitFor();
        String log = out.toString();
        if (exit != 0) {
            throw new IllegalStateException("SeaTunnel Spark 查询退出码 " + exit + ":\n" + tail(log, 40));
        }
        return log;
    }

    /** 解析 Console sink 输出（row=N : {json} 行）为 List<Map>。 */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseConsoleResult(String log) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (String line : log.split("\n")) {
            String t = line.trim();
            int colon = t.indexOf(" : ");
            if (colon < 0) continue;
            String json = t.substring(colon + 3).trim();
            if (json.startsWith("{") && json.endsWith("}")) {
                try {
                    rows.add(objectMapper.readValue(json, Map.class));
                } catch (Exception ignored) {}
            }
        }
        return rows;
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
