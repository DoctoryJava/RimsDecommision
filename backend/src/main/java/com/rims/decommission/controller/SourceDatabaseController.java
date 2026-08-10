package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RSourceDatabase;
import com.rims.decommission.mapper.RSourceDatabaseMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StringUtils;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/source-databases")
@Tag(name = "源数据库")
public class SourceDatabaseController {

    private final RSourceDatabaseMapper mapper;

    public SourceDatabaseController(RSourceDatabaseMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    @Operation(summary = "源数据库列表（按系统筛选）")
    public Result<List<Map<String,Object>>> list(
            @RequestParam(required=false) String systemId,
            @RequestParam(required=false) String search) {
        LambdaQueryWrapper<RSourceDatabase> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(systemId)) w.eq(RSourceDatabase::getSourceSystemId, systemId);
        if (StringUtils.hasText(search)) {
            w.and(x -> x.like(RSourceDatabase::getDatabaseName, search)
                    .or().like(RSourceDatabase::getServer, search));
        }
        w.orderByAsc(RSourceDatabase::getId);
        List<Map<String,Object>> list = mapper.selectList(w).stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(list);
    }

    @GetMapping("/{id}")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        RSourceDatabase e = mapper.selectById(id);
        if (e == null) return Result.fail(404, "数据源不存在");
        return Result.success(toMap(e));
    }

    @PostMapping
    @Operation(summary = "新增源数据库")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RSourceDatabase e = fromMap(body);
        if (e.getId() == null || e.getId().isBlank()) e.setId("sd-" + System.currentTimeMillis());
        mapper.insert(e);
        return Result.success(toMap(mapper.selectById(e.getId())));
    }

    @PutMapping("/{id}")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RSourceDatabase existing = mapper.selectById(id);
        RSourceDatabase e = fromMap(body);
        e.setId(id);
        // 未提交新密码时保留原密码
        if ((e.getPassword() == null || e.getPassword().isBlank()) && existing != null) {
            e.setPassword(existing.getPassword());
        }
        mapper.updateById(e);
        return Result.success(toMap(mapper.selectById(id)));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        mapper.deleteById(id);
        return Result.success(null);
    }

    private Map<String,Object> toMap(RSourceDatabase e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("sourceSystemId", e.getSourceSystemId());
        m.put("dbType", e.getDbType());
        m.put("server", e.getServer());
        m.put("port", e.getPort() != null ? e.getPort() : 0);
        m.put("databaseName", e.getDatabaseName());
        m.put("username", e.getUsername());
        // 密码不返回明文，仅标记是否已配置
        m.put("hasPassword", e.getPassword() != null && !e.getPassword().isBlank());
        m.put("connectionSecretRef", e.getConnectionSecretRef());
        m.put("connStringHash", e.getConnStringHash());
        m.put("description", e.getDescription());
        return m;
    }

    private RSourceDatabase fromMap(Map<String,Object> m) {
        RSourceDatabase e = new RSourceDatabase();
        e.setSourceSystemId(str(m.get("sourceSystemId")));
        e.setDbType(str(m.get("dbType")));
        e.setServer(str(m.get("server")));
        if (m.get("port") instanceof Number n) e.setPort(n.intValue());
        else if (m.get("port") instanceof String s) { try { e.setPort(Integer.parseInt(s)); } catch (Exception ignored) {} }
        e.setDatabaseName(str(m.get("databaseName")));
        e.setUsername(str(m.get("username")));
        e.setPassword(str(m.get("password")));
        e.setConnectionSecretRef(str(m.get("connectionSecretRef")));
        e.setConnStringHash(str(m.get("connStringHash")));
        e.setDescription(str(m.get("description")));
        return e;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
