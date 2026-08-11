package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RAuditLog;
import com.rims.decommission.mapper.RAuditLogMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit-logs")
@Tag(name = "审计日志")
public class AuditLogController {

    private final RAuditLogMapper mapper;

    public AuditLogController(RAuditLogMapper mapper) {
        this.mapper = mapper;
    }

    @GetMapping
    @Operation(summary = "审计日志分页列表（可按类型/结果/操作人/时间范围筛选）")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String operator,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        LambdaQueryWrapper<RAuditLog> w = new LambdaQueryWrapper<RAuditLog>()
                .orderByDesc(RAuditLog::getExecutedAt);
        if (StringUtils.hasText(actionType)) w.eq(RAuditLog::getActionType, actionType);
        if (StringUtils.hasText(status)) w.eq(RAuditLog::getStatus, status);
        if (StringUtils.hasText(operator)) w.like(RAuditLog::getOperator, operator);
        if (StringUtils.hasText(search)) {
            w.and(x -> x.like(RAuditLog::getOperator, search).or().like(RAuditLog::getSqlText, search));
        }
        if (StringUtils.hasText(start)) {
            LocalDateTime s = LocalDateTime.parse(start.replace(" ", "T"));
            w.ge(RAuditLog::getExecutedAt, s);
        }
        if (StringUtils.hasText(end)) {
            LocalDateTime e = LocalDateTime.parse(end.replace(" ", "T"));
            w.le(RAuditLog::getExecutedAt, e);
        }
        Page<RAuditLog> p = new Page<>(pageNum, pageSize);
        var ipage = mapper.selectPage(p, w);
        List<Map<String,Object>> list = ipage.getRecords().stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(PageResult.of(ipage.getTotal(), list, pageNum, pageSize));
    }

    @GetMapping("/{id}")
    @Operation(summary = "审计日志详情")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        RAuditLog log = mapper.selectById(id);
        if (log == null) return Result.fail(404, "日志不存在");
        return Result.success(toMap(log));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除审计日志")
    public Result<Void> delete(@PathVariable String id) {
        mapper.deleteById(id);
        return Result.success(null);
    }

    private Map<String,Object> toMap(RAuditLog log) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", log.getId());
        m.put("operator", log.getOperator());
        m.put("actionType", log.getActionType());
        m.put("sqlText", log.getSqlText());
        m.put("status", log.getStatus());
        m.put("systemId", log.getSystemId());
        m.put("detail", log.getDetail() != null ? log.getDetail() : Map.of());
        m.put("executedAt", log.getExecutedAt() != null ? log.getExecutedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : null);
        return m;
    }
}
