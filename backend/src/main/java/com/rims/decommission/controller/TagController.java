package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RObjectTag;
import com.rims.decommission.entity.RTag;
import com.rims.decommission.mapper.RObjectTagMapper;
import com.rims.decommission.mapper.RTagMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tags")
@Tag(name = "标签管理")
public class TagController {

    private final RTagMapper tagMapper;
    private final RObjectTagMapper objectTagMapper;

    public TagController(RTagMapper tagMapper, RObjectTagMapper objectTagMapper) {
        this.tagMapper = tagMapper;
        this.objectTagMapper = objectTagMapper;
    }

    // ---- Tags ----
    @GetMapping
    @Operation(summary = "标签列表")
    public Result<List<Map<String,Object>>> list() {
        return Result.success(tagMapper.selectList(new LambdaQueryWrapper<RTag>().orderByAsc(RTag::getId))
                .stream().map(this::tagMap).collect(Collectors.toList()));
    }

    @PostMapping
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RTag e = new RTag();
        e.setId("tag-" + System.currentTimeMillis());
        e.setTagKey(str(body.get("tagKey")));
        e.setTagValue(str(body.get("tagValue")));
        tagMapper.insert(e);
        return Result.success(tagMap(tagMapper.selectById(e.getId())));
    }

    @PutMapping("/{id}")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RTag e = tagMapper.selectById(id);
        if (e == null) return Result.fail(404, "标签不存在");
        e.setTagKey(str(body.getOrDefault("tagKey", e.getTagKey())));
        e.setTagValue(str(body.getOrDefault("tagValue", e.getTagValue())));
        tagMapper.updateById(e);
        return Result.success(tagMap(tagMapper.selectById(id)));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        tagMapper.deleteById(id);
        objectTagMapper.delete(new LambdaQueryWrapper<RObjectTag>().eq(RObjectTag::getTagId, id));
        return Result.success(null);
    }

    // ---- Object tags ----
    @GetMapping("/objects")
    @Operation(summary = "对象标签列表")
    public Result<List<Map<String,Object>>> objectTags(
            @RequestParam(required=false) String objectType,
            @RequestParam(required=false) String objectId) {
        LambdaQueryWrapper<RObjectTag> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(objectType)) w.eq(RObjectTag::getObjectType, objectType);
        if (StringUtils.hasText(objectId)) w.eq(RObjectTag::getObjectId, objectId);
        w.orderByAsc(RObjectTag::getId);
        return Result.success(objectTagMapper.selectList(w).stream().map(this::objectTagMap).collect(Collectors.toList()));
    }

    @PostMapping("/objects")
    public Result<Map<String,Object>> assignObjectTag(@RequestBody Map<String,Object> body) {
        RObjectTag e = new RObjectTag();
        e.setId("ot-" + System.currentTimeMillis());
        e.setObjectType(str(body.get("objectType")));
        e.setObjectId(str(body.get("objectId")));
        e.setTagId(str(body.get("tagId")));
        objectTagMapper.insert(e);
        return Result.success(objectTagMap(objectTagMapper.selectById(e.getId())));
    }

    @DeleteMapping("/objects/{id}")
    public Result<Void> deleteObjectTag(@PathVariable String id) {
        objectTagMapper.deleteById(id);
        return Result.success(null);
    }

    private Map<String,Object> tagMap(RTag e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("tagKey", e.getTagKey());
        m.put("tagValue", e.getTagValue());
        return m;
    }

    private Map<String,Object> objectTagMap(RObjectTag e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("objectType", e.getObjectType());
        m.put("objectId", e.getObjectId());
        m.put("tagId", e.getTagId());
        RTag t = tagMapper.selectById(e.getTagId());
        m.put("tagKey", t != null ? t.getTagKey() : null);
        m.put("tagValue", t != null ? t.getTagValue() : null);
        return m;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
