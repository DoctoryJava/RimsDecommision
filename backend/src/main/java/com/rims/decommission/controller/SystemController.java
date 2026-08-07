package com.rims.decommission.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RSystem;
import com.rims.decommission.service.RSystemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/systems")
@Tag(name = "退役系统")
public class SystemController {

    private final RSystemService service;

    public SystemController(RSystemService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "退役系统列表（r_system 表）")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String stage) {
        Page<RSystem> p = new Page<>(pageNum, pageSize);
        var ipage = service.page(p, search, stage);
        List<Map<String,Object>> list = ipage.getRecords().stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(PageResult.of(ipage.getTotal(), list, pageNum, pageSize));
    }

    @PostMapping
    @Operation(summary = "注册退役系统（写入 r_system）")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RSystem e = fromMap(body);
        e = service.create(e);
        return Result.success(toMap(e));
    }

    @GetMapping("/{id}")
    @Operation(summary = "系统详情")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        RSystem e = service.getById(id);
        if (e == null) return Result.fail(404, "系统不存在");
        return Result.success(toMap(e));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新系统")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RSystem e = fromMap(body);
        e = service.update(id, e);
        return Result.success(toMap(e));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除系统")
    public Result<Void> delete(@PathVariable String id) {
        service.delete(id);
        return Result.success(null);
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "系统状态（含同步进度）")
    public Result<Map<String,Object>> status(@PathVariable String id) {
        RSystem e = service.getById(id);
        if (e == null) return Result.fail(404, "系统不存在");
        return Result.success(Map.<String,Object>of("systemId", id, "status", e.getStatus(), "progress",
                "ARCHIVED".equals(e.getStatus()) ? 100 : 60));
    }

    private Map<String,Object> toMap(RSystem e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("name", e.getName());
        m.put("code", e.getCode());
        m.put("description", e.getDescription());
        m.put("owner", e.getOwner());
        m.put("department", e.getDepartment());
        m.put("stage", e.getStage());
        m.put("status", e.getStatus());
        m.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        m.put("archivedAt", e.getArchivedAt() != null ? e.getArchivedAt().toString() : null);
        m.put("dbConfig", e.getDbConfig());
        m.put("storageConfig", e.getStorageConfig());
        m.put("lastSync", e.getLastSync());
        m.put("syncStatus", e.getSyncStatus());
        m.put("schemaCount", e.getSchemaCount() != null ? e.getSchemaCount() : 0);
        m.put("tableCount", e.getTableCount() != null ? e.getTableCount() : 0);
        m.put("dataSizeGB", e.getDataSizeGb() != null ? e.getDataSizeGb() : 0);
        m.put("tags", e.getTags() != null ? e.getTags() : List.of());
        return m;
    }

    private RSystem fromMap(Map<String,Object> m) {
        RSystem e = new RSystem();
        if (m.get("id") != null) e.setId(m.get("id").toString());
        e.setName(str(m.get("name")));
        e.setCode(str(m.get("code")));
        e.setDescription(str(m.get("description")));
        e.setOwner(str(m.get("owner")));
        e.setDepartment(str(m.get("department")));
        Object st = m.get("status");
        if (st == null) st = m.get("stage");
        if (st != null) e.setStatus(st.toString());
        e.setStage(str(m.get("stage")));
        e.setLastSync(str(m.get("lastSync")));
        e.setSyncStatus(str(m.get("syncStatus")));
        if (m.get("schemaCount") instanceof Number n) e.setSchemaCount(n.intValue());
        if (m.get("tableCount") instanceof Number n) e.setTableCount(n.intValue());
        if (m.get("dataSizeGB") instanceof Number n) e.setDataSizeGb(n.intValue());
        if (m.get("dbConfig") instanceof Map<?,?> map) e.setDbConfig(cast(map));
        if (m.get("storageConfig") instanceof Map<?,?> map) e.setStorageConfig(cast(map));
        if (m.get("tags") instanceof List<?> list) e.setTags(castStr(list));
        return e;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> cast(Map<?,?> map) { return (Map<String, Object>) map; }
    @SuppressWarnings("unchecked")
    private static List<String> castStr(List<?> list) { return (List<String>) list; }
    private static String str(Object o) { return o != null ? o.toString() : null; }
}
