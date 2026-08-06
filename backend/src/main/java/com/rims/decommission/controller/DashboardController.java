package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.mock.MockStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Tag(name = "仪表盘")
public class DashboardController {

    @GetMapping("/systems/stats")
    @Operation(summary = "系统统计")
    public Result<Map<String,Object>> stats() {
        var systems = MockStore.systems();
        long active = systems.stream().filter(s -> "active".equals(s.get("stage"))).count();
        long deprecated = systems.stream().filter(s -> "deprecated".equals(s.get("stage"))).count();
        long archived = systems.stream().filter(s -> "archived".equals(s.get("stage"))).count();
        int totalGB = systems.stream().mapToInt(s -> (Integer)s.get("dataSizeGB")).sum();
        return Result.success(Map.of("active",active,"deprecated",deprecated,"archived",archived,"totalDataGB",totalGB,"total",systems.size()));
    }

    @GetMapping("/storage/usage")
    @Operation(summary = "存储用量")
    public Result<List<Map<String,Object>>> storageUsage() {
        var list = MockStore.systems().stream().map(s -> Map.of("system", s.get("code"), "gb", s.get("dataSizeGB"))).collect(Collectors.toList());
        return Result.success(list);
    }

    @GetMapping("/sync/activity")
    @Operation(summary = "同步活跃度")
    public Result<List<Map<String,Object>>> activity() {
        return Result.success(List.of(
            Map.of("day","Mon","success",4,"failed",1),
            Map.of("day","Tue","success",5,"failed",0),
            Map.of("day","Wed","success",3,"failed",2)
        ));
    }
}
