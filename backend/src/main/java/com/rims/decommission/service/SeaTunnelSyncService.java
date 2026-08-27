package com.rims.decommission.service;

import com.rims.decommission.config.SeaTunnelProperties;
import com.rims.decommission.entity.*;
import com.rims.decommission.mapper.RSchemaMapper;
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
    private final RSchemaMapper schemaMapper;
    private final AuditLogService auditLogService;
    private final com.rims.decommission.mapper.RSyncTableConfigMapper tableConfigMapper;
    private final SparkQueryService sparkQueryService;

    public SeaTunnelSyncService(SeaTunnelProperties props, RSourceDatabaseMapper sourceDbMapper,
                                RSyncJobMapper syncJobMapper, RSyncTableStatMapper tableStatMapper,
                                RSchemaMapper schemaMapper, AuditLogService auditLogService,
                                com.rims.decommission.mapper.RSyncTableConfigMapper tableConfigMapper,
                                SparkQueryService sparkQueryService) {
        this.props = props;
        this.sourceDbMapper = sourceDbMapper;
        this.syncJobMapper = syncJobMapper;
        this.tableStatMapper = tableStatMapper;
        this.schemaMapper = schemaMapper;
        this.auditLogService = auditLogService;
        this.tableConfigMapper = tableConfigMapper;
        this.sparkQueryService = sparkQueryService;
    }

    /** 触发同步（异步调用）。 */
    public void triggerSync(String systemId, String systemName, String jobId, String triggeredBy) {
        new Thread(() -> runSync(systemId, systemName, jobId, triggeredBy), "seatunnel-sync-" + jobId).start();
    }

    /** 定时任务专用：对某系统已落盘的数据按保留策略删除过期数据（不重新全量同步）。 */
    public void runRetentionForSystem(String systemId) {
        new Thread(() -> {
            try {
                List<RSourceDatabase> sources = sourceDbMapper.selectList(
                        new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSourceDatabase>()
                                .eq(RSourceDatabase::getSourceSystemId, systemId));
                if (sources.isEmpty()) return;
                for (RSourceDatabase src : sources) {
                    // 取该源库已同步的表（来自 r_sync_table_stat）
                    List<RSyncTableStat> stats = tableStatMapper.selectList(
                            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSyncTableStat>()
                                    .eq(RSyncTableStat::getSystemId, systemId)
                                    .eq(RSyncTableStat::getDatabaseName, src.getDatabaseName()));
                    List<String> tables = stats.stream()
                            .map(RSyncTableStat::getTableName)
                            .filter(t -> t != null && !t.isBlank())
                            .toList();
                    if (tables.isEmpty()) continue;
                    List<Map<String, Object>> logs = new ArrayList<>();
                    addLog(logs, "INFO", "定时保留删除：系统 " + systemId + " 源库 " + src.getDatabaseName());
                    applyRetention(src, tables, logs);
                }
            } catch (Exception ignored) {
            }
        }, "retention-" + systemId).start();
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
            // 每次同步前清空该系统旧的表统计与表结构（保证只保留最新一次同步的表和字段）
            clearSystemSyncData(systemId);
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
        List<String> allTables = listTables(engine, src.getServer(), port, src.getDatabaseName(),
                src.getUsername(), src.getPassword());
        // 检查该源库是否已配置表同步策略（完全未配置则报错，提示先配置）
        long cfgCount = 0;
        if (src.getId() != null) {
            cfgCount = tableConfigMapper.selectCount(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSyncTableConfig>()
                            .eq(RSyncTableConfig::getSourceDatabaseId, src.getId()));
        }
        if (cfgCount == 0) {
            throw new IllegalStateException("源库 " + src.getDatabaseName() + " 未配置表同步策略，请先在数据源的表配置里勾选要同步的表");
        }
        // 按同步前配置过滤：只同步 enabled=1 的表
        List<String> tables = filterEnabledTables(src, allTables);
        if (tables.isEmpty()) {
            addLog(logs, "WARN", "源库 " + src.getDatabaseName() + " 无表可同步（勾选的表均为空）");
            throw new IllegalStateException("源库 " + src.getDatabaseName() + " 没有勾选任何要同步的表，请先在表配置里勾选");
        }
        addLog(logs, "INFO", "待同步表: " + String.join(", ", tables));

        long rows;
        if (!props.isEnabled()) {
            // 未启用真实 SeaTunnel 时，模拟成功（每个表直接落一个占位 Iceberg 目录 + 元数据）
            rows = simulateSync(src, tables, logs);
        } else {
            // 物理清理该库的 Iceberg 落盘目录，确保每次同步都是一份全新数据（不累积旧文件/版本）
            cleanTableDirs(src, logs);
            rows = runSeatunnel(src, engine, port, tables, logs);
            // 同步完成后，按每表生命周期保留策略删除超期数据
            applyRetention(src, tables, logs);
        }
        // 同步完成后，扫描落盘目录，统计每个表的大小与行数并入库
        collectTableStats(job, src, tables);
        // 保存该源库各表的表结构（字段名+类型）到 r_schema，供 Query Config 选字段
        saveTableSchema(job.getSystemId(), src, tables);
        return rows;
    }

    /** 按 r_sync_table_config 过滤要同步的表（无配置默认同步）。 */
    private List<String> filterEnabledTables(RSourceDatabase src, List<String> allTables) {
        Map<String, RSyncTableConfig> cfgByTable = new HashMap<>();
        if (src.getId() != null) {
            for (RSyncTableConfig c : tableConfigMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSyncTableConfig>()
                            .eq(RSyncTableConfig::getSourceDatabaseId, src.getId()))) {
                cfgByTable.put(c.getTableName(), c);
            }
        }
        List<String> result = new ArrayList<>();
        for (String t : allTables) {
            RSyncTableConfig c = cfgByTable.get(t);
            // 只同步明确勾选(enabled=1)的表；未配置或取消勾选都不同步
            boolean enabled = (c != null) && (c.getEnabled() != null && c.getEnabled() == 1);
            if (enabled) result.add(t);
        }
        return result;
    }

    /** 对配置了 retain_years 的表，用 Spark DELETE 删除 N 年前的数据。 */
    private void applyRetention(RSourceDatabase src, List<String> tables, List<Map<String,Object>> logs) {
        if (src.getId() == null) return;
        Map<String, RSyncTableConfig> cfgByTable = new HashMap<>();
        for (RSyncTableConfig c : tableConfigMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSyncTableConfig>()
                        .eq(RSyncTableConfig::getSourceDatabaseId, src.getId()))) {
            cfgByTable.put(c.getTableName(), c);
        }
        String db = safeName(src.getDatabaseName());
        for (String t : tables) {
            RSyncTableConfig c = cfgByTable.get(t);
            if (c == null || c.getRetainYears() == null || c.getDateColumn() == null || c.getDateColumn().isBlank()) continue;
            // 保留最近 N 年：删除「当前日期往前推 N 年」之前的数据（精确到日）
            // 例：2026-08-13 保留 5 年 → 删除 2021-08-13 之前的数据
            String cutoff = java.time.LocalDate.now().minusYears(c.getRetainYears()).toString();
            // Iceberg 表名：catalog.db.archive.table
            String fullTable = db + ".archive." + safeName(t);
            String sql = "DELETE FROM " + fullTable + " WHERE " + c.getDateColumn() + " < '" + cutoff + "'";
            addLog(logs, "INFO", "生命周期策略: " + t + " 保留 " + c.getRetainYears() + " 年，删除 " + cutoff + " 之前数据（字段 " + c.getDateColumn() + "）");
            try {
                sparkQueryService.executeQuery(src.getSourceSystemId(), src.getDatabaseName(), sql, 1, 10);
                addLog(logs, "INFO", t + " 生命周期删除完成");
            } catch (Exception e) {
                addLog(logs, "WARN", t + " 生命周期删除失败: " + safe(e.getMessage()));
            }
        }
    }

    /** 每次同步前，清空该系统旧的表统计（r_sync_table_stat）与表结构（r_schema），保证只保留最新一次。 */
    private void clearSystemSyncData(String systemId) {
        try {
            tableStatMapper.delete(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSyncTableStat>()
                    .eq(RSyncTableStat::getSystemId, systemId));
        } catch (Exception ignored) {}
        try {
            schemaMapper.delete(new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSchema>()
                    .eq(RSchema::getSystemId, systemId));
        } catch (Exception ignored) {}
    }

    /** 读取源库每张表的列结构，写入 r_schema（按 systemId+databaseName 一条记录）。 */
    private void saveTableSchema(String systemId, RSourceDatabase src, List<String> tables) {
        String engine = src.getDbType() == null ? "mysql" : src.getDbType().toLowerCase();
        int port = src.getPort() != null ? src.getPort() : defaultPort(engine);
        List<Map<String, Object>> tableDefs = new ArrayList<>();
        String url = jdbcUrl(engine, src.getServer(), port, src.getDatabaseName());
        try (Connection c = DriverManager.getConnection(url, src.getUsername(), src.getPassword())) {
            for (String t : tables) {
                Map<String, Object> tableDef = new LinkedHashMap<>();
                tableDef.put("name", t);
                List<Map<String, Object>> cols = new ArrayList<>();
                try (ResultSet rs = c.getMetaData().getColumns(src.getDatabaseName(), null, t, "%")) {
                    while (rs.next()) {
                        Map<String, Object> col = new LinkedHashMap<>();
                        col.put("name", rs.getString("COLUMN_NAME"));
                        col.put("type", rs.getString("TYPE_NAME"));
                        cols.add(col);
                    }
                }
                tableDef.put("columns", cols);
                tableDefs.add(tableDef);
            }
        } catch (Exception e) {
            // 无法读取列结构时，只记录表名，列留空
            for (String t : tables) {
                Map<String, Object> tableDef = new LinkedHashMap<>();
                tableDef.put("name", t);
                tableDef.put("columns", new ArrayList<>());
                tableDefs.add(tableDef);
            }
        }
        // upsert r_schema
        String dbName = src.getDatabaseName() == null ? "default" : src.getDatabaseName();
        RSchema schema = schemaMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSchema>()
                        .eq(RSchema::getSystemId, systemId)
                        .eq(RSchema::getName, dbName));
        if (schema == null) {
            schema = new RSchema();
            schema.setId("sc-" + System.currentTimeMillis());
            schema.setSystemId(systemId);
            schema.setName(dbName);
            schema.setTables(tableDefs);
            schema.setSyncedAt(LocalDateTime.now().toString());
            schemaMapper.insert(schema);
        } else {
            schema.setTables(tableDefs);
            schema.setSyncedAt(LocalDateTime.now().toString());
            schemaMapper.updateById(schema);
        }
    }

    /** 物理删除某源库在 warehouse 下的落盘目录（含 archive namespace），实现真正覆盖。 */
    private void cleanTableDirs(RSourceDatabase src, List<Map<String,Object>> logs) {
        String db = safeName(src.getDatabaseName());
        Path dbDir = Paths.get(props.getWarehouseDir(), db);
        if (!Files.exists(dbDir)) return;
        try {
            // 清理 {db}/archive（namespace 目录，SeaTunnel Iceberg 实际写这里）
            Path ns = dbDir.resolve("archive");
            if (Files.exists(ns)) {
                deleteRecursively(ns);
                addLog(logs, "INFO", "已物理删除旧 Iceberg 目录: " + ns);
            }
            // 清理 {db}/{table}/{stamp} 这类直接目录下所有子目录
            try (var stream = Files.list(dbDir)) {
                for (Path sub : (Iterable<Path>) stream.filter(Files::isDirectory).collect(Collectors.toList())) {
                    if (sub.getFileName().toString().equals("archive")) continue;
                    deleteRecursively(sub);
                    addLog(logs, "INFO", "已物理删除旧目录: " + sub);
                }
            }
        } catch (Exception e) {
            addLog(logs, "WARN", "清理旧目录失败(可忽略): " + safe(e.getMessage()));
        }
    }

    private void deleteRecursively(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                try { Files.deleteIfExists(p); } catch (Exception ignored) {}
            });
        }
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
                + "    # 每次同步覆盖表数据，避免多次同步 append 累加\n"
                + "    data_save_mode = \"DROP_DATA\"\n"
                + "    case_sensitive = false\n"
                + "  }\n"
                + "}\n";
        Files.createDirectories(Paths.get(props.getConfDir()));
        Path confPath = Paths.get(props.getConfDir(), "sync_" + System.currentTimeMillis() + ".conf");
        Files.writeString(confPath, conf, StandardCharsets.UTF_8);
        return confPath.toString();
    }

    // ---------- 已同步判断 ----------

    /** 判断系统是否已同步过：对比源库每表当前行数与上次成功同步的记录行数，全部一致则认为无需重复同步。 */
    public Map<String, Object> checkAlreadySynced(String systemId) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> sources = new ArrayList<>();
        boolean allSynced = true;
        boolean hasAnySync = false;
        try {
            var srcs = sourceDbMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSourceDatabase>()
                            .eq(RSourceDatabase::getSourceSystemId, systemId));
            for (RSourceDatabase src : srcs) {
                String engine = src.getDbType() == null ? "mysql" : src.getDbType().toLowerCase();
                int port = src.getPort() != null ? src.getPort() : defaultPort(engine);
                Map<String, Object> sm = new LinkedHashMap<>();
                sm.put("databaseName", src.getDatabaseName());
                sm.put("server", src.getServer());
                try {
                    // 源库当前行数
                    Map<String, Long> current = countSourceRows(engine, src.getServer(), port,
                            src.getDatabaseName(), src.getUsername(), src.getPassword());
                    // 上次成功同步的行数（按 database_name+table_name 取该表最近一条）
                    long unchanged = 0, changed = 0;
                    List<String> changedTables = new ArrayList<>();
                    for (var e : current.entrySet()) {
                        Long prev = lastSyncedRows(systemId, src.getDatabaseName(), e.getKey());
                        if (prev != null) { hasAnySync = true; }
                        if (prev != null && prev.equals(e.getValue())) {
                            unchanged++;
                        } else {
                            changed++;
                            changedTables.add(e.getKey());
                        }
                    }
                    sm.put("totalTables", current.size());
                    sm.put("unchangedTables", unchanged);
                    sm.put("changedTables", changed);
                    sm.put("changedTableNames", changedTables);
                    sm.put("alreadySynced", changed == 0 && current.size() > 0);
                    if (changed > 0) allSynced = false;
                } catch (Exception ex) {
                    sm.put("error", safe(ex.getMessage()));
                    allSynced = false;
                }
                sources.add(sm);
            }
        } catch (Exception e) {
            allSynced = false;
        }
        result.put("alreadySynced", allSynced && !sources.isEmpty() && hasAnySync);
        result.put("hasAnySync", hasAnySync);
        result.put("sources", sources);
        return result;
    }

    /** 统计源库每个表的当前行数。 */
    private Map<String, Long> countSourceRows(String engine, String host, int port, String db,
                                              String user, String pwd) {
        Map<String, Long> counts = new LinkedHashMap<>();
        String url = jdbcUrl(engine, host, port, db);
        try (Connection c = DriverManager.getConnection(url, user, pwd)) {
            try (ResultSet rs = c.getMetaData().getTables(db, null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    String t = rs.getString("TABLE_NAME");
                    if (t == null) continue;
                    String schema = rs.getString("TABLE_SCHEM");
                    String q = "SELECT COUNT(*) FROM " + qualify(c, schema, t);
                    try (Statement st = c.createStatement(); ResultSet cr = st.executeQuery(q)) {
                        if (cr.next()) counts.put(t, cr.getLong(1));
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception ignored) {}
        return counts;
    }

    /**
     * 按驱动自身的标识符引用符拼「[schema.]table」，兼容不同源库方言。
     * MySQL 返回 `，SQL Server / PostgreSQL / Oracle 返回 "，避免硬编码反引号。
     */
    private String qualify(Connection c, String schema, String table) {
        String q;
        try {
            q = c.getMetaData().getIdentifierQuoteString();
        } catch (Exception e) {
            q = "\"";
        }
        if (q == null || q.isBlank()) q = "\"";
        final String quote = q;
        java.util.function.UnaryOperator<String> wrap =
                s -> quote + s.replace(quote, quote + quote) + quote;
        return (schema == null || schema.isBlank())
                ? wrap.apply(table)
                : wrap.apply(schema) + "." + wrap.apply(table);
    }

    /** 取某表最近一次成功同步的行数。 */
    private Long lastSyncedRows(String systemId, String databaseName, String tableName) {
        try {
            var stat = tableStatMapper.selectOne(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<RSyncTableStat>()
                            .eq(RSyncTableStat::getSystemId, systemId)
                            .eq(RSyncTableStat::getDatabaseName, databaseName)
                            .eq(RSyncTableStat::getTableName, tableName)
                            .orderByDesc(RSyncTableStat::getCreatedAt)
                            // SQL Server 无 LIMIT，用 OFFSET/FETCH 取首行（已有 ORDER BY，语法要求满足）
                            .last("OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY"));
            return stat != null ? stat.getRowCount() : null;
        } catch (Exception e) { return null; }
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
            stat.setSchemaName(src.getDatabaseName());
            // blob_url：本地落盘目录地址（绝对路径）
            stat.setBlobUrl(tableDir != null ? tableDir.toString() : null);
            stat.setChecksum("");
            stat.setEtag("");
            stat.setCreatedOn(LocalDateTime.now());
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

    /** 解析 metadata.json：取 current-snapshot-id 指向的 snapshot 的 total-records（当前表实际行数）。 */
    private long parseIcebergMetadata(Path metaFile) {
        try {
            String json = Files.readString(metaFile, StandardCharsets.UTF_8);
            com.fasterxml.jackson.databind.JsonNode root =
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
            com.fasterxml.jackson.databind.JsonNode currentId = root.get("current-snapshot-id");
            com.fasterxml.jackson.databind.JsonNode snapshots = root.get("snapshots");
            if (snapshots == null || !snapshots.isArray()) return 0;
            for (com.fasterxml.jackson.databind.JsonNode snap : snapshots) {
                if (currentId != null && currentId.isNumber()) {
                    com.fasterxml.jackson.databind.JsonNode sid = snap.get("snapshot-id");
                    if (sid == null || !sid.isNumber() || sid.asLong() != currentId.asLong()) continue;
                }
                com.fasterxml.jackson.databind.JsonNode summary = snap.get("summary");
                if (summary == null || !summary.isObject()) continue;
                long total = nodeLong(summary, "total-records");
                return total > 0 ? total : nodeLong(summary, "added-records");
            }
        } catch (Exception ignored) {}
        return 0;
    }

    private long nodeLong(com.fasterxml.jackson.databind.JsonNode node, String field) {
        com.fasterxml.jackson.databind.JsonNode v = node.get(field);
        if (v == null || v.isNull()) return 0;
        if (v.isNumber()) return v.asLong();
        // Iceberg metadata 里 total-records/added-records 是字符串数字，如 "9"
        if (v.isTextual()) {
            try { return Long.parseLong(v.asText().trim()); } catch (NumberFormatException ignored) {}
        }
        return 0;
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
        // 记录 ETL 审计日志（最终执行结果）
        String operator = job.getTriggeredBy() != null ? job.getTriggeredBy() : "Manual";
        Map<String,Object> detail = new LinkedHashMap<>();
        detail.put("systemName", job.getSystemName() != null ? job.getSystemName() : "");
        detail.put("jobId", job.getId());
        detail.put("records", job.getRecords() != null ? job.getRecords() : 0);
        detail.put("duration", job.getDuration());
        if (error != null) detail.put("error", error);
        auditLogService.record("etl", operator,
                "SeaTunnel 同步: " + job.getSystemName() + " (" + job.getSystemId() + ")",
                status, job.getSystemId(), detail);
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
