package com.rims.decommission.service;

import com.rims.decommission.config.SeaTunnelProperties;
import com.rims.decommission.entity.RSourceDatabase;
import com.rims.decommission.entity.RSyncJob;
import com.rims.decommission.entity.RSyncTableStat;
import com.rims.decommission.mapper.RSourceDatabaseMapper;
import com.rims.decommission.mapper.RSyncJobMapper;
import com.rims.decommission.mapper.RSyncTableStatMapper;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 基于 SeaTunnel 的数据同步服务。
 * 从源数据库 JDBC 读取全部表，以 Iceberg 格式落盘到本地磁盘（模拟存储桶）。
 */
@Service
public class SeaTunnelSyncService {

    private final SeaTunnelProperties props;
    private final RSourceDatabaseMapper sourceDbMapper;
    private final RSyncJobMapper syncJobMapper;
    private final RSyncTableStatMapper tableStatMapper;

    public SeaTunnelSyncService(SeaTunnelProperties props, RSourceDatabaseMapper sourceDbMapper,
                                RSyncJobMapper syncJobMapper, RSyncTableStatMapper tableStatMapper) {
        this.props = props;
        this.sourceDbMapper = sourceDbMapper;
        this.syncJobMapper = syncJobMapper;
        this.tableStatMapper = tableStatMapper;
    }

    /** 触发同步（异步调用）。 */
    public void triggerSync(String systemId, String systemName, String jobId, String triggeredBy) {
        new Thread(() -> runSync(systemId, systemName, jobId, triggeredBy), "seatunnel-sync-" + jobId).start();
    }

    private void runSync(String systemId, String systemName, String jobId, String triggeredBy) {
        RSyncJob job = syncJobMapper.selectById(jobId);
        if (job == null) return;
        List<Map<String, Object>> logs = new ArrayList<>();
        addLog(logs, "INFO", "开始同步：系统 " + systemName + " (" + systemId + ")");
        try {
            // 取该系统所有源数据库
            var sources = sourceDbMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSourceDatabase>()
                            .eq(RSourceDatabase::getSourceSystemId, systemId));
            if (sources.isEmpty()) {
                updateJob(job, "failed", 0L, logs, null);
                return;
            }
            long totalRecords = 0;
            for (RSourceDatabase src : sources) {
                addLog(logs, "INFO", "同步源库 " + src.getDatabaseName() + "@" + src.getServer());
                long rows = syncOneSource(job, src, logs);
                totalRecords += rows;
                addLog(logs, "INFO", "源库 " + src.getDatabaseName() + " 完成，共 " + rows + " 行");
            }
            updateJob(job, "success", totalRecords, logs, null);
        } catch (Exception e) {
            e.printStackTrace();
            addLog(logs, "ERROR", "同步失败：" + safe(e.getMessage()));
            updateJob(job, "failed", job.getRecords(), logs, safe(e.getMessage()));
        }
    }

    private long syncOneSource(RSyncJob job, RSourceDatabase src, List<Map<String, Object>> logs) throws Exception {
        String engine = src.getDbType() == null ? "mysql" : src.getDbType().toLowerCase();
        int port = src.getPort() != null ? src.getPort() : defaultPort(engine);
        List<String> tables = listTables(engine, src.getServer(), port, src.getDatabaseName(),
                src.getUsername(), src.getPassword());
        if (tables.isEmpty()) {
            addLog(logs, "WARN", "源库 " + src.getDatabaseName() + " 无表可同步");
            return 0;
        }
        addLog(logs, "INFO", "待同步表: " + String.join(", ", tables));

        long rows;
        if (!props.isEnabled()) {
            // 未启用真实 SeaTunnel 时，模拟成功（每个表直接落一个占位 Iceberg 目录 + 元数据）
            rows = simulateSync(src, tables, logs);
        } else {
            rows = runSeatunnel(src, engine, port, tables, logs);
        }
        // 同步完成后，扫描落盘目录，统计每个表的大小与行数并入库
        collectTableStats(job, src, tables);
        return rows;
    }

    /** 模拟同步：在磁盘 warehouse 下建目录并写元数据文件。 */
    private long simulateSync(RSourceDatabase src, List<String> tables, List<Map<String,Object>> logs) throws IOException {
        String stamp = timestamp();
        long rows = 0;
        for (String t : tables) {
            Path dir = Paths.get(props.getWarehouseDir(), safeName(src.getDatabaseName()), safeName(t), stamp);
            Files.createDirectories(dir);
            // 模拟 Iceberg 元数据占位文件
            Path meta = dir.resolve("_SIMULATED_ICEBERG.json");
            String content = "{\"source\":\"" + src.getServer() + "\",\"database\":\"" + src.getDatabaseName()
                    + "\",\"table\":\"" + t + "\",\"format\":\"iceberg\",\"simulated\":true,\"ts\":\"" + stamp + "\"}";
            Files.writeString(meta, content, StandardCharsets.UTF_8);
            rows += 1; // 模拟每表至少 1 行
        }
        addLog(logs, "INFO", "[模拟] 已写 Iceberg 占位到 " + props.getWarehouseDir()
                + "（SEATUNNEL_ENABLED=false，未实际调用 SeaTunnel）");
        return rows;
    }

    /** 真实调用 SeaTunnel 命令行（默认 local 模式，进程内起临时引擎，跑完即退）。 */
    private long runSeatunnel(RSourceDatabase src, String engine, int port, List<String> tables,
                              List<Map<String,Object>> logs) throws Exception {
        String confFile = writeConf(src, engine, port, tables);
        String seatunnelSh = props.getHome() + "/bin/seatunnel.sh";
        // -m local: 本地单机模式（不连 Hazelcast server 集群），适合测试/无集群环境
        ProcessBuilder pb = new ProcessBuilder(seatunnelSh, "--config", confFile, "-m", "local");
        pb.redirectErrorStream(true);
        Process p = pb.start();
        StringBuilder out = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) {
                out.append(line).append('\n');
                if (line.contains("Error") || line.contains("ERROR")) addLog(logs, "ERROR", line.trim());
                else if (line.contains("INFO")) addLog(logs, "INFO", line.trim());
            }
        }
        int exit = p.waitFor();
        if (exit != 0) {
            throw new RuntimeException("SeaTunnel 退出码 " + exit + ":\n" + out);
        }
        // 行数无法从命令行直接拿到，近似用表数量
        addLog(logs, "INFO", "SeaTunnel 执行完成，退出码 0");
        return tables.size();
    }

    /** 生成 SeaTunnel .conf（Jdbc source -> Iceberg sink，Hadoop catalog 本地 warehouse）。 */
    private String writeConf(RSourceDatabase src, String engine, int port, List<String> tables) throws IOException {
        String driver = jdbcDriver(engine);
        String db = src.getDatabaseName() == null ? "" : src.getDatabaseName();
        String url = jdbcUrl(engine, src.getServer(), port, db);
        // table_list 的 table_path 必须是 "库名.表名"
        StringBuilder tableList = new StringBuilder("table_list = [\n");
        for (String t : tables) {
            tableList.append("    { table_path = \"").append(esc(db)).append(".").append(esc(t)).append("\" },\n");
        }
        tableList.append("  ]");

        String warehouse = props.getWarehouseDir() + "/" + safeName(db);
        String conf = "env {\n"
                + "  parallelism = 1\n"
                + "  job.mode = \"BATCH\"\n"
                + "}\n"
                + "source {\n"
                + "  Jdbc {\n"
                + "    driver = \"" + driver + "\"\n"
                + "    url = \"" + url + "\"\n"
                + "    user = \"" + esc(src.getUsername()) + "\"\n"
                + "    password = \"" + esc(src.getPassword()) + "\"\n"
                + "    database = \"" + esc(db) + "\"\n"
                + "    " + tableList + "\n"
                + "  }\n"
                + "}\n"
                + "transform {\n}\n"
                + "sink {\n"
                + "  Iceberg {\n"
                + "    catalog_name = \"rims_local\"\n"
                + "    iceberg.catalog.config = {\n"
                + "      type = \"hadoop\"\n"
                + "      warehouse = \"file://" + warehouse + "\"\n"
                + "    }\n"
                + "    namespace = \"archive\"\n"
                + "    table = \"${table_name}\"\n"
                + "    iceberg.table.write-props = {\n"
                + "      write.format.default = \"parquet\"\n"
                + "    }\n"
                + "    iceberg.table.schema-evolution-enabled = true\n"
                + "    case_sensitive = false\n"
                + "  }\n"
                + "}\n";
        Files.createDirectories(Paths.get(props.getConfDir()));
        Path confPath = Paths.get(props.getConfDir(), "sync_" + System.currentTimeMillis() + ".conf");
        Files.writeString(confPath, conf, StandardCharsets.UTF_8);
        return confPath.toString();
    }

    // ---------- 表级统计 ----------

    /** 扫描落盘目录，统计每个表的大小与行数，写入 r_sync_table_stat。 */
    private void collectTableStats(RSyncJob job, RSourceDatabase src, List<String> tables) {
        String db = safeName(src.getDatabaseName());
        Path dbDir = Paths.get(props.getWarehouseDir(), db);
        for (String t : tables) {
            String tblName = safeName(t);
            // 兼容多种落盘层级：
            //   {db}/{table}/{stamp}        (模拟模式)
            //   {db}/archive/{table}        (真实 SeaTunnel, namespace=archive)
            //   {db}/{table}                (直接)
            Path tableDir = findTableDir(dbDir, tblName);
            long size = 0;
            long rows = 0;
            if (tableDir != null) {
                try { size = dirSize(tableDir); } catch (Exception ignored) {}
                rows = readIcebergRowCount(tableDir);
            }
            RSyncTableStat stat = new RSyncTableStat();
            stat.setId("st-" + System.currentTimeMillis() + "-" + Math.abs(t.hashCode() % 100000));
            stat.setJobId(job.getId());
            stat.setSystemId(job.getSystemId());
            stat.setDatabaseName(src.getDatabaseName());
            stat.setTableName(t);
            stat.setRowCount(rows);
            stat.setSizeBytes(size);
            try { tableStatMapper.insert(stat); } catch (Exception ignored) {}
        }
    }

    /** 在 dbDir 下查找某表的实际目录，兼容 {table}、archive/{table}、{table}/{stamp}。 */
    private Path findTableDir(Path dbDir, String tblName) {
        if (dbDir == null) return null;
        // 直接 {db}/{table}
        Path direct = dbDir.resolve(tblName);
        if (Files.isDirectory(direct)) return direct;
        // namespace 层级 {db}/archive/{table}
        Path ns = dbDir.resolve("archive").resolve(tblName);
        if (Files.isDirectory(ns)) return ns;
        // 模拟模式 {db}/{table}/{stamp}：取 table 下第一个子目录
        if (Files.isDirectory(direct)) {
            try (var stream = Files.list(direct)) {
                var list = stream.filter(Files::isDirectory).findFirst();
                if (list.isPresent()) return list.get();
            } catch (Exception ignored) {}
        }
        // 其它 namespace 名
        try (var stream = Files.list(dbDir)) {
            for (Path sub : (Iterable<Path>) stream.filter(Files::isDirectory).collect(Collectors.toList())) {
                Path cand = sub.resolve(tblName);
                if (Files.isDirectory(cand)) return cand;
            }
        } catch (Exception ignored) {}
        return null;
    }

    /** 递归统计目录大小（字节）。 */
    private long dirSize(Path dir) throws IOException {
        if (!Files.exists(dir)) return 0;
        try (var stream = Files.walk(dir)) {
            return stream.filter(Files::isRegularFile)
                    .mapToLong(p -> { try { return Files.size(p); } catch (Exception e) { return 0L; } })
                    .sum();
        }
    }

    /** 读取 Iceberg 表目录的行数：解析 metadata.json 里 snapshot 的 summary（total-records / added-records）。 */
    private long readIcebergRowCount(Path tableDir) {
        try {
            Path metaDir = tableDir.resolve("metadata");
            if (!Files.isDirectory(metaDir)) return 0;
            try (var stream = Files.list(metaDir)) {
                List<Path> metas = stream
                        .filter(p -> p.getFileName().toString().matches("v\\d+\\.metadata\\.json"))
                        .sorted(Comparator.reverseOrder())
                        .collect(Collectors.toList());
                if (!metas.isEmpty()) {
                    long rows = parseIcebergMetadata(metas.get(0));
                    if (rows > 0) return rows;
                }
            }
        } catch (Exception ignored) {}
        return 0;
    }

    /** 解析 metadata.json：累加每个 snapshot summary 里的 total-records（无则 added-records）。 */
    private long parseIcebergMetadata(Path metaFile) {
        long rows = 0;
        try {
            String json = Files.readString(metaFile, StandardCharsets.UTF_8);
            com.fasterxml.jackson.databind.JsonNode root =
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
            com.fasterxml.jackson.databind.JsonNode snapshots = root.get("snapshots");
            if (snapshots != null && snapshots.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode snap : snapshots) {
                    com.fasterxml.jackson.databind.JsonNode summary = snap.get("summary");
                    if (summary == null || !summary.isObject()) continue;
                    long total = nodeLong(summary, "total-records");
                    long added = nodeLong(summary, "added-records");
                    rows += (total > 0 ? total : added);
                }
            }
        } catch (Exception ignored) {}
        return rows;
    }

    private long nodeLong(com.fasterxml.jackson.databind.JsonNode node, String field) {
        com.fasterxml.jackson.databind.JsonNode v = node.get(field);
        if (v == null || !v.isNumber()) return 0;
        return v.asLong();
    }

    // ---------- helpers ----------

    private List<String> listTables(String engine, String host, int port, String db, String user, String pwd) {
        List<String> tables = new ArrayList<>();
        String url = jdbcUrl(engine, host, port, db);
        String driver = jdbcDriver(engine);
        // 只列目标数据库的表：把 db 作为 catalog 传入；第二个参数 schema 传 null，
        // 再按 TABLE_CAT/TABLE_SCHEM 双重过滤，避免拿到别的库的表
        try (Connection c = DriverManager.getConnection(url, user, pwd);
             ResultSet rs = c.getMetaData().getTables(db, null, "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                String cat = rs.getString("TABLE_CAT");
                String schema = rs.getString("TABLE_SCHEM");
                String t = rs.getString("TABLE_NAME");
                if (t == null) continue;
                String owner = cat != null ? cat : schema;
                // 仅保留属于目标数据库的表
                if (owner == null || owner.equals(db)) {
                    tables.add(t);
                }
            }
        } catch (Exception e) {
            // 无驱动或无权限时回退到默认表名列表
            tables.addAll(List.of("sample_table"));
        }
        return tables;
    }

    private String jdbcDriver(String engine) {
        switch (engine) {
            case "mysql": return "com.mysql.cj.jdbc.Driver";
            case "postgresql": return "org.postgresql.Driver";
            case "sqlserver": return "com.microsoft.sqlserver.jdbc.SQLServerDriver";
            case "oracle": return "oracle.jdbc.driver.OracleDriver";
            default: return "com.mysql.cj.jdbc.Driver";
        }
    }

    private String jdbcUrl(String engine, String host, int port, String db) {
        switch (engine) {
            case "mysql":
                return "jdbc:mysql://" + host + ":" + port + "/" + db + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
            case "postgresql": return "jdbc:postgresql://" + host + ":" + port + "/" + db;
            case "sqlserver": return "jdbc:sqlserver://" + host + ":" + port + ";databaseName=" + db + ";encrypt=false";
            case "oracle": return "jdbc:oracle:thin:@//" + host + ":" + port + "/" + db;
            default: return "jdbc:mysql://" + host + ":" + port + "/" + db;
        }
    }

    private int defaultPort(String engine) {
        switch (engine) {
            case "mysql": return 3306;
            case "postgresql": return 5432;
            case "sqlserver": return 1433;
            case "oracle": return 1521;
            default: return 3306;
        }
    }

    private void updateJob(RSyncJob job, String status, Long records, List<Map<String,Object>> logs, String error) {
        job.setStatus(status);
        job.setRecords(records != null ? records : job.getRecords());
        job.setLogs(logs);
        job.setDuration(duration(job.getStartedAt()));
        syncJobMapper.updateById(job);
    }

    private String duration(String startedAt) {
        try {
            LocalDateTime s = LocalDateTime.parse(startedAt.replace(" ", "T"));
            long sec = java.time.Duration.between(s, LocalDateTime.now()).getSeconds();
            return sec + "s";
        } catch (Exception e) { return ""; }
    }

    private void addLog(List<Map<String,Object>> logs, String level, String msg) {
        logs.add(Map.<String,Object>of("time", LocalDateTime.now().toString(), "level", level, "message", msg));
    }

    private String timestamp() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private String safe(String s) { return s == null ? "" : s; }
    private String safeName(String s) {
        return s == null ? "default" : s.replaceAll("[^a-zA-Z0-9_\\-]", "_");
    }
    private String esc(String s) { return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\""); }
}
