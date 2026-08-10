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
        List<RSyncTableStat> stats = tableStatMapper.selectList(
                new LambdaQueryWrapper<RSyncTableStat>()
                        .eq(RSyncTableStat::getSystemId, systemId)
                        .select(RSyncTableStat::getDatabaseName, RSyncTableStat::getTableName)
                        .groupBy(RSyncTableStat::getDatabaseName, RSyncTableStat::getTableName));
        // 按库分组
        Map<String, Set<String>> grouped = new LinkedHashMap<>();
        for (RSyncTableStat s : stats) {
            String db = s.getDatabaseName() == null ? "default" : s.getDatabaseName();
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
    public Map<String, Object> executeQuery(String systemId, String sql, int page, int pageSize) {
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
            // 生成并执行 PySpark 脚本
            String script = writeScript(sql);
            String outFile = runSpark(script, sql);
            List<Map<String, Object>> all = readResult(outFile);
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

    /** 生成 PySpark 脚本：配置 Iceberg Hadoop catalog，执行 SQL，结果写 JSON。 */
    private String writeScript(String sql) throws IOException {
        String script = ""
                + "from pyspark.sql import SparkSession\n"
                + "import json\n"
                + "spark = SparkSession.builder.appName('rims_query').master('local[1]').config('spark.sql.catalog.rims', 'org.apache.iceberg.spark.SparkCatalog').config('spark.sql.catalog.rims.type', 'hadoop').config('spark.sql.catalog.rims.warehouse', '" + props.getWarehouseDir() + "').getOrCreate()\n"
                + "try:\n"
                + "    df = spark.sql('''" + sql.replace("'", "\\'") + "''')\n"
                + "    rows = df.toJSON().collect()\n"
                + "    print('__RIMS_RESULT__')\n"
                + "    for r in rows:\n"
                + "        print(r)\n"
                + "except Exception as e:\n"
                + "    print('__RIMS_ERROR__' + str(e))\n"
                + "    import sys\n"
                + "    sys.exit(1)\n"
                + "spark.stop()\n";
        Files.createDirectories(Paths.get(System.getProperty("java.io.tmpdir"), "rims_spark"));
        Path p = Paths.get(System.getProperty("java.io.tmpdir"), "rims_spark", "query_" + System.currentTimeMillis() + ".py");
        Files.writeString(p, script, StandardCharsets.UTF_8);
        return p.toString();
    }

    private String runSpark(String script, String sql) throws Exception {
        String sparkSubmit = props.getHome() + "/bin/spark-submit";
        String outFile = System.getProperty("java.io.tmpdir") + "/rims_spark/out_" + System.currentTimeMillis() + ".json";
        ProcessBuilder pb = new ProcessBuilder(
                sparkSubmit,
                "--master", "local[1]",
                "--packages", props.getIcebergPackage(),
                script);
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
        if (exit != 0 || log.contains("__RIMS_ERROR__")) {
            String err = log.contains("__RIMS_ERROR__")
                    ? log.substring(log.indexOf("__RIMS_ERROR__") + "__RIMS_ERROR__".length()).split("\n")[0].trim()
                    : "spark-submit 退出码 " + exit;
            throw new IllegalStateException(err);
        }
        // 解析 __RIMS_RESULT__ 之后的每行 JSON
        StringBuilder rowsBuf = new StringBuilder();
        int idx = log.indexOf("__RIMS_RESULT__");
        if (idx >= 0) {
            String after = log.substring(idx + "__RIMS_RESULT__".length());
            String[] lines = after.split("\n");
            rowsBuf.append("[");
            boolean first = true;
            for (String ln : lines) {
                ln = ln.trim();
                if (ln.isEmpty() || ln.startsWith("22/") || ln.startsWith("24/")) continue;
                if (!first) rowsBuf.append(",");
                rowsBuf.append(ln);
                first = false;
            }
            rowsBuf.append("]");
        }
        Files.writeString(Paths.get(outFile), rowsBuf.toString(), StandardCharsets.UTF_8);
        return outFile;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readResult(String outFile) throws IOException {
        String json = Files.readString(Paths.get(outFile), StandardCharsets.UTF_8);
        if (json == null || json.isBlank() || "[]".equals(json.trim())) return new ArrayList<>();
        return objectMapper.readValue(json, List.class);
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
