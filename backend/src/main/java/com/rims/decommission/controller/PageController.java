package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RPage;
import com.rims.decommission.mapper.RPageMapper;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pages")
@Tag(name = "页面管理")
public class PageController {

    private final RPageMapper mapper;

    public PageController(RPageMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    public Result<List<Map<String,Object>>> list() {
        return Result.success(query(null));
    }

    @GetMapping("/user")
    public Result<List<Map<String,Object>>> userPages(@RequestParam(required = false) String role) {
        return Result.success(query(role));
    }

    @PutMapping("/order")
    public Result<List<Map<String,Object>>> order(@RequestBody Map<String,Object> body) {
        if (body.get("pages") instanceof List<?> pages) {
            for (Object o : pages) {
                if (o instanceof Map<?,?> pm) {
                    Object id = pm.get("id");
                    Object order = pm.get("order");
                    if (id != null && order instanceof Number n) {
                        RPage pg = mapper.selectById(id.toString());
                        if (pg != null) { pg.setSortOrder(n.intValue()); mapper.updateById(pg); }
                    }
                }
            }
        }
        return Result.success(query(null));
    }

    private List<Map<String,Object>> query(String role) {
        List<RPage> all = mapper.selectList(new LambdaQueryWrapper<RPage>().orderByAsc(RPage::getSortOrder));
        return all.stream()
                .filter(p -> role == null || role.isBlank() || p.getVisibleTo() == null || p.getVisibleTo().contains(role))
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    private Map<String,Object> toMap(RPage p) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("name", p.getName());
        m.put("path", p.getPath());
        m.put("module", p.getModule());
        m.put("icon", p.getIcon());
        m.put("visibleTo", p.getVisibleTo() != null ? p.getVisibleTo() : List.of());
        m.put("order", p.getSortOrder() != null ? p.getSortOrder() : 0);
        m.put("enabled", p.getEnabled() != null && p.getEnabled() == 1);
        return m;
    }
}
