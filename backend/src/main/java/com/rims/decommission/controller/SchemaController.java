package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RPhysicalTable;
import com.rims.decommission.entity.RSchema;
import com.rims.decommission.mapper.RPhysicalTableMapper;
import com.rims.decommission.mapper.RSchemaMapper;
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

    public SchemaController(RSchemaMapper schemaMapper, RPhysicalTableMapper tableMapper) {
        this.schemaMapper = schemaMapper;
        this.tableMapper = tableMapper;
    }

    @GetMapping("/systems/{id}/schemas")
    @Operation(summary = "获取 Schema 列表（r_schema 表）")
    public Result<List<Map<String,Object>>> bySystem(@PathVariable String id) {
        List<RSchema> list = schemaMapper.selectList(new LambdaQueryWrapper<RSchema>()
                .eq("all".equals(id), RSchema::getSystemId, id));
        return Result.success(list.stream().map(this::toMap).collect(Collectors.toList()));
    }

    @GetMapping("/schemas")
    @Operation(summary = "所有 Schema")
    public Result<List<Map<String,Object>>> all() {
        return Result.success(schemaMapper.selectList(null).stream().map(this::toMap).collect(Collectors.toList()));
    }

    @PostMapping("/systems/{id}/schemas/discover")
    @Operation(summary = "自动探测源表结构")
    public Result<List<Map<String,Object>>> discover(@PathVariable String id) {
        return Result.success(List.of(Map.of("tableName","CUSTOMER_ORDER","columns",12,"discovered",true)));
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
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("systemId", s.getSystemId());
        m.put("name", s.getName());
        m.put("tables", s.getTables() != null ? s.getTables() : List.of());
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
