package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RUnstructuredItem;
import com.rims.decommission.mapper.RUnstructuredItemMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StringUtils;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/unstructured-items")
@Tag(name = "非结构化条目")
public class UnstructuredItemController {

    private final RUnstructuredItemMapper mapper;

    public UnstructuredItemController(RUnstructuredItemMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    @Operation(summary = "条目列表（按源筛选）")
    public Result<List<Map<String,Object>>> list(@RequestParam(required=false) String sourceId) {
        LambdaQueryWrapper<RUnstructuredItem> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(sourceId)) w.eq(RUnstructuredItem::getUnstructuredSourceId, sourceId);
        w.orderByAsc(RUnstructuredItem::getId);
        List<Map<String,Object>> list = mapper.selectList(w).stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(list);
    }

    @PostMapping
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RUnstructuredItem e = fromMap(body);
        if (e.getId() == null || e.getId().isBlank()) e.setId("ui-" + System.currentTimeMillis());
        mapper.insert(e);
        return Result.success(toMap(mapper.selectById(e.getId())));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        mapper.deleteById(id);
        return Result.success(null);
    }

    private Map<String,Object> toMap(RUnstructuredItem e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("unstructuredSourceId", e.getUnstructuredSourceId());
        m.put("originalPath", e.getOriginalPath());
        m.put("originalName", e.getOriginalName());
        m.put("sizeBytes", e.getSizeBytes());
        m.put("contentType", e.getContentType());
        m.put("lastModified", e.getLastModified() != null ? e.getLastModified().toString() : null);
        m.put("derivedDate", e.getDerivedDate() != null ? e.getDerivedDate().toString() : null);
        m.put("hash", e.getHash());
        return m;
    }

    private RUnstructuredItem fromMap(Map<String,Object> m) {
        RUnstructuredItem e = new RUnstructuredItem();
        e.setUnstructuredSourceId(str(m.get("unstructuredSourceId")));
        e.setOriginalPath(str(m.get("originalPath")));
        e.setOriginalName(str(m.get("originalName")));
        if (m.get("sizeBytes") instanceof Number n) e.setSizeBytes(n.longValue());
        e.setContentType(str(m.get("contentType")));
        if (m.get("lastModified") instanceof String s) e.setLastModified(parse(s));
        if (m.get("derivedDate") instanceof String s) e.setDerivedDate(parseDate(s));
        e.setHash(str(m.get("hash")));
        return e;
    }

    private static java.time.LocalDateTime parse(String s) {
        try { return java.time.LocalDateTime.parse(s.replace(" ", "T")); } catch (Exception e) { return null; }
    }
    private static java.time.LocalDate parseDate(String s) {
        try { return java.time.LocalDate.parse(s); } catch (Exception e) { return null; }
    }
    private static String str(Object o) { return o != null ? o.toString() : null; }
}
