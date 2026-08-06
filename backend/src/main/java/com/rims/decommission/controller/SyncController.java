package com.rims.decommission.controller;

import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.mock.MockStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sync")
@Tag(name = "数据同步")
public class SyncController {

    @GetMapping("/jobs")
    @Operation(summary = "同步任务列表")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue="1") int pageNum,
            @RequestParam(defaultValue="20") int pageSize,
            @RequestParam(required=false) String status) {
        var list = MockStore.syncJobs();
        if (status != null && !status.isBlank()) {
            list = list.stream().filter(j -> status.equals(j.get("status"))).collect(Collectors.toList());
        }
        int from = Math.min((pageNum-1)*pageSize, list.size());
        int to = Math.min(from+pageSize, list.size());
        return Result.success(PageResult.of(list.size(), list.subList(from,to), pageNum, pageSize));
    }

    @PostMapping("/jobs")
    @Operation(summary = "创建同步任务")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        body.putIfAbsent("id","job-"+System.currentTimeMillis());
        body.put("status","syncing");
        body.put("startedAt", java.time.LocalDateTime.now().toString());
        return Result.success(body);
    }

    @GetMapping("/jobs/{id}")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        return MockStore.syncJobs().stream().filter(j -> id.equals(j.get("id"))).findFirst()
                .map(Result::success).orElse(Result.fail(404,"任务不存在"));
    }

    @PostMapping("/jobs/{id}/cancel")
    public Result<Void> cancel(@PathVariable String id) {
        return Result.success(null);
    }

    @GetMapping("/jobs/{id}/logs")
    public Result<List<Map<String,Object>>> logs(@PathVariable String id) {
        return Result.success(List.of(
            Map.of("time","2026-08-06 02:14","level","INFO","message","开始同步表 order_header"),
            Map.of("time","2026-08-06 02:15","level","INFO","message","完成 4820000 行")
        ));
    }
}
