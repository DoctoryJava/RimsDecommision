package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RSystem;
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

    public DashboardController(RSystemService systemService) {
        this.systemService = systemService;
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
                    m.put("gb", s.getDataSizeGb() != null ? s.getDataSizeGb() : 0);
                    return m;
                })
                .collect(Collectors.toList());
        return Result.success(list);
    }

    @GetMapping("/sync/activity")
    @Operation(summary = "同步活跃度")
    public Result<List<Map<String,Object>>> activity() {
        return Result.success(List.of(
            Map.<String,Object>of("day","Mon","success",4,"failed",1),
            Map.<String,Object>of("day","Tue","success",5,"failed",0),
            Map.<String,Object>of("day","Wed","success",3,"failed",2)
        ));
    }
}
