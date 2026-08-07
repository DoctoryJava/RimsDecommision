package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RSyncActivity;
import com.rims.decommission.entity.RSystem;
import com.rims.decommission.mapper.RSyncActivityMapper;
import com.rims.decommission.service.RSystemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Tag(name = "仪表盘")
public class DashboardController {

    private final RSystemService systemService;
    private final RSyncActivityMapper syncActivityMapper;

    public DashboardController(RSystemService systemService, RSyncActivityMapper syncActivityMapper) {
        this.systemService = systemService;
        this.syncActivityMapper = syncActivityMapper;
    }

    @GetMapping("/systems/stats")
    @Operation(summary = "系统统计")
    public Result<Map<String,Object>> stats() {
        var systems = systemService.listAll();
        long active = systems.stream().filter(s -> "active".equals(s.getStage())).count();
        long deprecated = systems.stream().filter(s -> "deprecated".equals(s.getStage())).count();
        long archived = systems.stream().filter(s -> "archived".equals(s.getStage())).count();
        int totalGB = systems.stream().mapToInt(s -> s.getDataSizeGb() != null ? s.getDataSizeGb() : 0).sum();
        return Result.success(Map.<String,Object>of("active",active,"deprecated",deprecated,"archived",archived,"totalDataGB",totalGB,"total",systems.size()));
    }

    @GetMapping("/storage/usage")
    @Operation(summary = "存储用量")
    public Result<List<Map<String,Object>>> storageUsage() {
        var list = systemService.listAll().stream()
                .map(s -> {
                    Map<String,Object> m = new LinkedHashMap<>();
                    m.put("system", s.getCode());
                    m.put("name", s.getName());
                    m.put("gb", s.getDataSizeGb() != null ? s.getDataSizeGb() : 0);
                    return m;
                })
                .collect(Collectors.toList());
        return Result.success(list);
    }

    @GetMapping("/sync/activity")
    @Operation(summary = "同步活跃度（r_sync_activity 表）")
    public Result<List<Map<String,Object>>> activity() {
        List<RSyncActivity> rows = syncActivityMapper.selectList(
                new LambdaQueryWrapper<RSyncActivity>()
                        .orderByAsc(RSyncActivity::getActivityDate)
                        .last("LIMIT 7"));
        List<Map<String,Object>> list = rows.stream().map(a -> {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("day", a.getDayLabel());
            m.put("success", a.getSuccessCount() != null ? a.getSuccessCount() : 0);
            m.put("failed", a.getFailedCount() != null ? a.getFailedCount() : 0);
            m.put("partial", a.getPartialCount() != null ? a.getPartialCount() : 0);
            return m;
        }).collect(Collectors.toList());
        return Result.success(list);
    }
}
