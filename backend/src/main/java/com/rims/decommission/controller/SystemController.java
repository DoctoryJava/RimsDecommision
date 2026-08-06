package com.rims.decommission.controller;

import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.DecommSystem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/systems")
@Tag(name = "退役系统")
public class SystemController {

    @GetMapping
    @Operation(summary = "退役系统列表")
    public Result<PageResult<DecommSystem>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String search) {
        // TODO: MyBatis-Plus 分页查询 decomm_system
        return Result.success(PageResult.of(0, List.of(), pageNum, pageSize));
    }

    @PostMapping
    @Operation(summary = "注册退役系统")
    public Result<DecommSystem> create(@RequestBody DecommSystem system) {
        // TODO: 校验 system_code 唯一 + 插入
        return Result.success(system);
    }

    @GetMapping("/{id}")
    @Operation(summary = "系统详情")
    public Result<DecommSystem> detail(@PathVariable Long id) {
        DecommSystem s = new DecommSystem();
        s.setId(id);
        s.setSystemName("Mock 系统");
        s.setSystemCode("MOCK_V1");
        s.setStatus("REGISTERED");
        return Result.success(s);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新系统")
    public Result<DecommSystem> update(@PathVariable Long id, @RequestBody DecommSystem system) {
        system.setId(id);
        return Result.success(system);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除系统")
    public Result<Void> delete(@PathVariable Long id) {
        return Result.success(null);
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "系统状态（含同步进度）")
    public Result<Map<String,Object>> status(@PathVariable Long id) {
        return Result.success(Map.of("systemId", id, "status", "REGISTERED", "progress", 0));
    }
}
