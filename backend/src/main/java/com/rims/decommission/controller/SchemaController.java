package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RPhysicalTable;
import com.rims.decommission.entity.RSchema;
import com.rims.decommission.entity.RSyncTableStat;
import com.rims.decommission.mapper.RPhysicalTableMapper;
import com.rims.decommission.mapper.RSchemaMapper;
import com.rims.decommission.mapper.RSyncTableStatMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Tag(name = "Schema Registry")
public class SchemaController {

    private final RSchemaMapper schemaMapper;
    private final RPhysicalTableMapper tableMapper;
    private final RSyncTableStatMapper tableStatMapper;

    public SchemaController(RSchemaMapper schemaMapper, RPhysicalTableMapper tableMapper, RSyncTableStatMapper tableStatMapper) {
        this.schemaMapper = schemaMapper;
        this.tableMapper = tableMapper;
        this.tableStatMapper = tableStatMapper;
    }

    @GetMapping("/systems/{id}/schemas")
    @Operation(summary = "获取 Schema 列表（r_schema 表）")
    public Result<List<Map<String,Object>>> bySystem(@PathVariable String id) {
        List<RSchema> list = schemaMapper.selectList(new LambdaQueryWrapper<RSchema>()
                .eq("all".equals(id), RSchema::getSystemId, id));
        return Result.success(list.stream().map(s -> toMap(s, buildStatLookup(id))).collect(Collectors.toList()));
    }

    @GetMapping("/schemas")
    @Operation(summary = "所有 Schema")
    public Result<List<Map<String,Object>>> all() {
        Map<String, Map<String,Object>> statLookup = new HashMap<>();
        for (RSyncTableStat st : tableStatMapper.selectList(new LambdaQueryWrapper<RSyncTableStat>().isNotNull(RSyncTableStat::getTableName))) {
            String key = st.getSystemId() + "|" + st.getDatabaseName() + "|" + st.getTableName();
            Map<String,Object> m = Map.of(
                    "rowCount", st.getRowCount() != null ? st.getRowCount() : 0L,
                    "sizeBytes", st.getSizeBytes() != null ? st.getSizeBytes() : 0L);
            statLookup.put(key, m);
        }
        return Result.success(schemaMapper.selectList(null).stream().map(s -> toMap(s, statLookup)).collect(Collectors.toList()));
    }

    /** 构建 <systemId>|<db>|<table> -> 真实统计 的查找表。 */
    private Map<String, Map<String,Object>> buildStatLookup(String systemId) {
        Map<String, Map<String,Object>> statLookup = new HashMap<>();
        List<RSyncTableStat> stats = systemId == null || systemId.isBlank()
                ? tableStatMapper.selectList(new LambdaQueryWrapper<RSyncTableStat>().isNotNull(RSyncTableStat::getTableName))
                : tableStatMapper.selectList(new LambdaQueryWrapper<RSyncTableStat>()
                        .eq(RSyncTableStat::getSystemId, systemId)
                        .isNotNull(RSyncTableStat::getTableName));
        for (RSyncTableStat st : stats) {
            String key = st.getSystemId() + "|" + st.getDatabaseName() + "|" + st.getTableName();
            Map<String,Object> m = Map.of(
                    "rowCount", st.getRowCount() != null ? st.getRowCount() : 0L,
                    "sizeBytes", st.getSizeBytes() != null ? st.getSizeBytes() : 0L);
            statLookup.put(key, m);
        }
        return statLookup;
    }

    @PostMapping("/systems/{id}/schemas/discover")
    @Operation(summary = "自动探测源表结构")
    public Result<List<Map<String,Object>>> discover(@PathVariable String id) {
        return Result.success(List.of(Map.<String,Object>of("tableName","CUSTOMER_ORDER","columns",12,"discovered",true)));
    }

    @GetMapping("/tables")
    @Operation(summary = "物理表列表（r_physical_table 表）")
    public Result<List<Map<String,Object>>> tables() {
        return Result.success(tableMapper.selectList(null).stream().map(this::toTableMap).collect(Collectors.toList()));
    }

    @GetMapping("/tables/{name}/columns")
    public Result<List<Map<String,Object>>> columns(@PathVariable String name) {
        RPhysicalTable t = tableMapper.selectOne(new LambdaQueryWrapper<RPhysicalTable>().eq(RPhysicalTable::getName, name));
        if (t == null || t.getColumns() == null) return Result.success(List.of());
        return Result.success(t.getColumns());
    }

    private Map<String,Object> toMap(RSchema s) {
        return toMap(s, Map.of());
    }

    /** 合并 r_sync_table_stat 的真实行数/大小到每个表。 */
    private Map<String,Object> toMap(RSchema s, Map<String, Map<String,Object>> statLookup) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("systemId", s.getSystemId());
        m.put("name", s.getName());
        List<Map<String,Object>> tables = new ArrayList<>();
        if (s.getTables() != null) {
            for (Object t : s.getTables()) {
                if (!(t instanceof Map<?,?> tm)) continue;
                @SuppressWarnings("unchecked")
                Map<String,Object> table = new LinkedHashMap<>((Map<String,Object>) tm);
                String tblName = table.get("name") != null ? table.get("name").toString() : null;
                if (tblName != null) {
                    Map<String,Object> stat = statLookup.get(s.getSystemId() + "|" + s.getName() + "|" + tblName);
                    if (stat != null) {
                        // 真实统计覆盖 mock 值；统一输出 rows/sizeMB/archived 供前端渲染
                        long rows = ((Number) stat.get("rowCount")).longValue();
                        long bytes = ((Number) stat.get("sizeBytes")).longValue();
                        table.put("rows", rows);
                        table.put("sizeMB", Math.round(bytes / (1024.0 * 1024.0) * 100.0) / 100.0);
                        table.put("archived", true);
                    }
                }
                tables.add(table);
            }
        }
        m.put("tables", tables);
        m.put("syncedAt", s.getSyncedAt());
        return m;
    }

    private Map<String,Object> toTableMap(RPhysicalTable t) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("name", t.getName());
        m.put("label", t.getLabel());
        m.put("systemId", t.getSystemId());
        m.put("columns", t.getColumns() != null ? t.getColumns() : List.of());
        m.put("rows", t.getRows() != null ? t.getRows() : List.of());
        return m;
    }
}
