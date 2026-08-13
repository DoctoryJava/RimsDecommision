package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RSourceDatabase;
import com.rims.decommission.entity.RSyncTableConfig;
import com.rims.decommission.mapper.RSourceDatabaseMapper;
import com.rims.decommission.mapper.RSyncTableConfigMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.sql.*;
import java.util.*;

@RestController
@RequestMapping("/api/sync-table-configs")
@Tag(name = "同步表配置")
public class SyncTableConfigController {

    private final RSyncTableConfigMapper mapper;
    private final RSourceDatabaseMapper sourceDbMapper;

    public SyncTableConfigController(RSyncTableConfigMapper mapper, RSourceDatabaseMapper sourceDbMapper) {
        this.mapper = mapper;
        this.sourceDbMapper = sourceDbMapper;
    }

    /** 列出某源库的所有表 + 现有同步配置（未配置的默认 enabled=1）。 */
    @GetMapping
    @Operation(summary = "列出来自某源库的表及其同步配置")
    public Result<List<Map<String,Object>>> list(@RequestParam String sourceDatabaseId) {
        RSourceDatabase src = sourceDbMapper.selectById(sourceDatabaseId);
        if (src == null) return Result.fail(404, "源数据库不存在");
        // 已存配置
        Map<String, RSyncTableConfig> cfgByTable = new HashMap<>();
        for (RSyncTableConfig c : mapper.selectList(new LambdaQueryWrapper<RSyncTableConfig>()
                .eq(RSyncTableConfig::getSourceDatabaseId, sourceDatabaseId))) {
            cfgByTable.put(c.getTableName(), c);
        }
        // 自动探测源库表
        List<String> tables = detectTables(src);
        List<Map<String,Object>> out = new ArrayList<>();
        for (String t : tables) {
            RSyncTableConfig c = cfgByTable.get(t);
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("tableName", t);
            m.put("configId", c != null ? c.getId() : null);
            m.put("enabled", c != null && (c.getEnabled() != null && c.getEnabled() == 1));
            m.put("dateColumn", c != null ? c.getDateColumn() : null);
            m.put("retainYears", c != null ? c.getRetainYears() : null);
            out.add(m);
        }
        return Result.success(out);
    }

    /** 保存（新增或更新）某表配置。 */
    @PostMapping
    @Operation(summary = "保存某表的同步配置")
    public Result<Map<String,Object>> save(@RequestBody Map<String,Object> body) {
        String sourceDbId = str(body.get("sourceDatabaseId"));
        String tableName = str(body.get("tableName"));
        if (sourceDbId == null || tableName == null) return Result.fail(400, "缺少源库ID或表名");
        RSyncTableConfig c = mapper.selectOne(new LambdaQueryWrapper<RSyncTableConfig>()
                .eq(RSyncTableConfig::getSourceDatabaseId, sourceDbId)
                .eq(RSyncTableConfig::getTableName, tableName));
        boolean isNew = (c == null);
        if (c == null) {
            c = new RSyncTableConfig();
            c.setId("tsc-" + System.currentTimeMillis());
            c.setSourceDatabaseId(sourceDbId);
            c.setSystemId(str(body.getOrDefault("systemId", null)));
            c.setTableName(tableName);
            c.setEnabled(1);
        }
        if (body.get("enabled") instanceof Boolean b) c.setEnabled(b ? 1 : 0);
        c.setDateColumn(str(body.get("dateColumn")));
        if (body.get("retainYears") instanceof Number n) c.setRetainYears(n.intValue());
        else if (body.get("retainYears") == null) c.setRetainYears(null);
        if (isNew) mapper.insert(c); else mapper.updateById(c);
        return Result.success(toMap(mapper.selectById(c.getId())));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        mapper.deleteById(id);
        return Result.success(null);
    }

    private List<String> detectTables(RSourceDatabase src) {
        String engine = src.getDbType() == null ? "mysql" : src.getDbType().toLowerCase();
        String url = jdbcUrl(engine, src.getServer(), src.getPort() != null ? src.getPort() : defaultPort(engine), src.getDatabaseName());
        List<String> tables = new ArrayList<>();
        try (Connection conn = DriverManager.getConnection(url, src.getUsername(), src.getPassword())) {
            DatabaseMetaData md = conn.getMetaData();
            try (ResultSet rs = md.getTables(src.getDatabaseName(), null, "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    String t = rs.getString("TABLE_NAME");
                    if (t != null && !t.isBlank()) tables.add(t);
                }
            }
        } catch (Exception ignored) {
        }
        Collections.sort(tables);
        return tables;
    }

    private Map<String,Object> toMap(RSyncTableConfig c) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("systemId", c.getSystemId());
        m.put("sourceDatabaseId", c.getSourceDatabaseId());
        m.put("tableName", c.getTableName());
        m.put("enabled", c.getEnabled() != null && c.getEnabled() == 1);
        m.put("dateColumn", c.getDateColumn());
        m.put("retainYears", c.getRetainYears());
        return m;
    }

    private int defaultPort(String engine) {
        return switch (engine) {
            case "postgresql" -> 5432;
            case "sqlserver" -> 1433;
            case "oracle" -> 1521;
            default -> 3306;
        };
    }
    private String jdbcUrl(String engine, String host, int port, String db) {
        return switch (engine) {
            case "postgresql" -> "jdbc:postgresql://" + host + ":" + port + "/" + db;
            case "sqlserver" -> "jdbc:sqlserver://" + host + ":" + port + ";databaseName=" + db + ";encrypt=false";
            case "oracle" -> "jdbc:oracle:thin:@//" + host + ":" + port + "/" + db;
            default -> "jdbc:mysql://" + host + ":" + port + "/" + db + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC";
        };
    }
    private static String str(Object o) { return o != null ? o.toString() : null; }
}
