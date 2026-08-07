package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RUnstructuredSource;
import com.rims.decommission.mapper.RUnstructuredSourceMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StringUtils;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/unstructured-sources")
@Tag(name = "非结构化数据源")
public class UnstructuredSourceController {

    private final RUnstructuredSourceMapper mapper;

    public UnstructuredSourceController(RUnstructuredSourceMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    @Operation(summary = "非结构化源列表（按系统筛选）")
    public Result<List<Map<String,Object>>> list(@RequestParam(required=false) String systemId) {
        LambdaQueryWrapper<RUnstructuredSource> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(systemId)) w.eq(RUnstructuredSource::getSourceSystemId, systemId);
        w.orderByAsc(RUnstructuredSource::getId);
        List<Map<String,Object>> list = mapper.selectList(w).stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(list);
    }

    @GetMapping("/{id}")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        RUnstructuredSource e = mapper.selectById(id);
        if (e == null) return Result.fail(404, "数据源不存在");
        return Result.success(toMap(e));
    }

    @PostMapping
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RUnstructuredSource e = fromMap(body);
        if (e.getId() == null || e.getId().isBlank()) e.setId("us-" + System.currentTimeMillis());
        mapper.insert(e);
        return Result.success(toMap(mapper.selectById(e.getId())));
    }

    @PutMapping("/{id}")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RUnstructuredSource e = fromMap(body);
        e.setId(id);
        mapper.updateById(e);
        return Result.success(toMap(mapper.selectById(id)));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        mapper.deleteById(id);
        return Result.success(null);
    }

    private Map<String,Object> toMap(RUnstructuredSource e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("sourceSystemId", e.getSourceSystemId());
        m.put("sourceType", e.getSourceType());
        m.put("locationUri", e.getLocationUri());
        m.put("mountPath", e.getMountPath());
        m.put("filePattern", e.getFilePattern());
        m.put("dateExtractionRule", e.getDateExtractionRule());
        m.put("description", e.getDescription());
        return m;
    }

    private RUnstructuredSource fromMap(Map<String,Object> m) {
        RUnstructuredSource e = new RUnstructuredSource();
        e.setSourceSystemId(str(m.get("sourceSystemId")));
        e.setSourceType(str(m.get("sourceType")));
        e.setLocationUri(str(m.get("locationUri")));
        e.setMountPath(str(m.get("mountPath")));
        e.setFilePattern(str(m.get("filePattern")));
        e.setDateExtractionRule(str(m.get("dateExtractionRule")));
        e.setDescription(str(m.get("description")));
        return e;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
