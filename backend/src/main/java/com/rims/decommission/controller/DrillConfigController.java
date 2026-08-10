package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RDrillConfig;
import com.rims.decommission.mapper.RDrillConfigMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/query-configs")
@Tag(name = "下钻配置")
public class DrillConfigController {

    private final RDrillConfigMapper mapper;

    public DrillConfigController(RDrillConfigMapper mapper) {
        this.mapper = mapper;
    }

    /** 按查询配置列出下钻配置（含层级结构）。 */
    @GetMapping("/{queryConfigId}/drills")
    @Operation(summary = "查询配置的下钻配置列表")
    public Result<List<Map<String,Object>>> list(@PathVariable String queryConfigId) {
        List<RDrillConfig> all = mapper.selectList(
                new LambdaQueryWrapper<RDrillConfig>()
                        .eq(RDrillConfig::getQueryConfigId, queryConfigId)
                        .orderByAsc(RDrillConfig::getSortOrder));
        // 组装为树（parent_id -> children）
        Map<String, Map<String,Object>> byId = new LinkedHashMap<>();
        List<Map<String,Object>> roots = new ArrayList<>();
        for (RDrillConfig c : all) byId.put(c.getId(), toMap(c));
        for (RDrillConfig c : all) {
            Map<String,Object> node = byId.get(c.getId());
            if (c.getParentId() == null || c.getParentId().isBlank() || !byId.containsKey(c.getParentId())) {
                roots.add(node);
            } else {
                Map<String,Object> parent = byId.get(c.getParentId());
                @SuppressWarnings("unchecked")
                List<Map<String,Object>> kids = (List<Map<String,Object>>) parent.get("children");
                kids.add(node);
            }
        }
        return Result.success(roots);
    }

    @PostMapping("/{queryConfigId}/drills")
    @Operation(summary = "新增下钻配置")
    public Result<Map<String,Object>> create(@PathVariable String queryConfigId, @RequestBody Map<String,Object> body) {
        RDrillConfig e = fromMap(body);
        e.setId("dr-" + System.currentTimeMillis());
        e.setQueryConfigId(queryConfigId);
        if (e.getSortOrder() == null) e.setSortOrder(0);
        mapper.insert(e);
        return Result.success(toMap(mapper.selectById(e.getId())));
    }

    @PutMapping("/{queryConfigId}/drills/{id}")
    @Operation(summary = "更新下钻配置")
    public Result<Map<String,Object>> update(@PathVariable String queryConfigId, @PathVariable String id, @RequestBody Map<String,Object> body) {
        RDrillConfig e = fromMap(body);
        e.setId(id);
        e.setQueryConfigId(queryConfigId);
        mapper.updateById(e);
        return Result.success(toMap(mapper.selectById(id)));
    }

    @DeleteMapping("/{queryConfigId}/drills/{id}")
    @Operation(summary = "删除下钻配置")
    public Result<Void> delete(@PathVariable String queryConfigId, @PathVariable String id) {
        // 级联删除子级
        List<RDrillConfig> all = mapper.selectList(new LambdaQueryWrapper<RDrillConfig>()
                .eq(RDrillConfig::getQueryConfigId, queryConfigId));
        Set<String> toDelete = new HashSet<>();
        toDelete.add(id);
        boolean changed = true;
        while (changed) {
            changed = false;
            for (RDrillConfig c : all) {
                if (c.getParentId() != null && toDelete.contains(c.getParentId()) && !toDelete.contains(c.getId())) {
                    toDelete.add(c.getId());
                    changed = true;
                }
            }
        }
        mapper.delete(new LambdaQueryWrapper<RDrillConfig>().in(RDrillConfig::getId, toDelete));
        return Result.success(null);
    }

    private Map<String,Object> toMap(RDrillConfig e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("queryConfigId", e.getQueryConfigId());
        m.put("parentId", e.getParentId());
        m.put("name", e.getName());
        m.put("baseTable", e.getBaseTable());
        m.put("parentField", e.getParentField());
        m.put("childField", e.getChildField());
        m.put("fields", e.getFields() != null ? e.getFields() : List.of());
        m.put("sortOrder", e.getSortOrder() != null ? e.getSortOrder() : 0);
        m.put("children", new ArrayList<Map<String,Object>>());
        return m;
    }

    private RDrillConfig fromMap(Map<String,Object> body) {
        RDrillConfig e = new RDrillConfig();
        if (body.get("parentId") != null) e.setParentId(body.get("parentId").toString());
        e.setName(str(body.get("name")));
        e.setBaseTable(str(body.get("baseTable")));
        e.setParentField(str(body.get("parentField")));
        e.setChildField(str(body.get("childField")));
        if (body.get("fields") instanceof List<?> l) {
            @SuppressWarnings("unchecked")
            List<Map<String,Object>> x = (List<Map<String,Object>>) l;
            e.setFields(x);
        }
        if (body.get("sortOrder") instanceof Number n) e.setSortOrder(n.intValue());
        return e;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
