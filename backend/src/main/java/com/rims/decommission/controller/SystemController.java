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
@RequestMapping("/api/systems")
@Tag(name = "退役系统")
public class SystemController {

    @GetMapping
    @Operation(summary = "退役系统列表")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String stage) {
        var list = MockStore.systems();
        if (search != null && !search.isBlank()) {
            String s = search.toLowerCase();
            list = list.stream().filter(m -> m.get("name").toString().toLowerCase().contains(s) || m.get("code").toString().toLowerCase().contains(s)).collect(Collectors.toList());
        }
        if (stage != null && !stage.isBlank() && !"all".equals(stage)) {
            list = list.stream().filter(m -> stage.equals(m.get("stage"))).collect(Collectors.toList());
        }
        int from = Math.min((pageNum-1)*pageSize, list.size());
        int to = Math.min(from+pageSize, list.size());
        return Result.success(PageResult.of(list.size(), list.subList(from,to), pageNum, pageSize));
    }

    @PostMapping
    @Operation(summary = "注册退役系统")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        body.putIfAbsent("id","sys-"+System.currentTimeMillis());
        body.putIfAbsent("stage","active");
        return Result.success(body);
    }

    @GetMapping("/{id}")
    @Operation(summary = "系统详情")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        return MockStore.systems().stream().filter(m -> id.equals(m.get("id"))).findFirst()
                .map(Result::success).orElse(Result.fail(404,"系统不存在"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新系统")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        body.put("id", id);
        return Result.success(body);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除系统")
    public Result<Void> delete(@PathVariable String id) {
        return Result.success(null);
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "系统状态（含同步进度）")
    public Result<Map<String,Object>> status(@PathVariable String id) {
        return Result.success(Map.of("systemId", id, "status", "active", "progress", 80));
    }

    @GetMapping("/{id}/db-config")
    public Result<Map<String,Object>> dbConfig(@PathVariable String id) {
        var sys = MockStore.systems().stream().filter(m -> id.equals(m.get("id"))).findFirst().orElse(null);
        if (sys==null) return Result.fail(404,"系统不存在");
        return Result.success((Map<String,Object>)sys.get("dbConfig"));
    }

    @PostMapping("/{id}/db-config/test")
    public Result<Map<String,Object>> testDb(@PathVariable String id) {
        return Result.success(Map.of("success",true,"message","连接成功 (mock)"));
    }
}
