package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RSyncJob;
import com.rims.decommission.entity.RSyncTableStat;
import com.rims.decommission.mapper.RSyncJobMapper;
import com.rims.decommission.mapper.RSyncTableStatMapper;
import com.rims.decommission.service.SeaTunnelSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sync")
@Tag(name = "数据同步")
public class SyncController {

    private final RSyncJobMapper mapper;
    private final RSyncTableStatMapper tableStatMapper;
    private final SeaTunnelSyncService seatunnel;

    public SyncController(RSyncJobMapper mapper, RSyncTableStatMapper tableStatMapper, SeaTunnelSyncService seatunnel) {
        this.mapper = mapper;
        this.tableStatMapper = tableStatMapper;
        this.seatunnel = seatunnel;
    }

    @GetMapping("/jobs")
    @Operation(summary = "同步任务列表（r_sync_job 表）")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue="1") int pageNum,
            @RequestParam(defaultValue="20") int pageSize,
            @RequestParam(required=false) String status,
            @RequestParam(required=false) String systemId) {
        LambdaQueryWrapper<RSyncJob> w = new LambdaQueryWrapper<>();
        if (status != null && !status.isBlank()) {
            w.eq(RSyncJob::getStatus, status);
        }
        if (systemId != null && !systemId.isBlank()) {
            w.eq(RSyncJob::getSystemId, systemId);
        }
        w.orderByDesc(RSyncJob::getCreatedAt);
        var ipage = mapper.selectPage(new Page<>(pageNum, pageSize), w);
        List<Map<String,Object>> list = ipage.getRecords().stream().map(this::toMap).collect(Collectors.toList());
        return Result.success(PageResult.of(ipage.getTotal(), list, pageNum, pageSize));
    }

    @PostMapping("/jobs")
    @Operation(summary = "创建同步任务并触发 SeaTunnel 同步")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        RSyncJob job = fromMap(body);
        if (job.getId() == null || job.getId().isBlank()) job.setId("job-" + System.currentTimeMillis());
        if (job.getStatus() == null) job.setStatus("syncing");
        if (job.getStartedAt() == null) job.setStartedAt(LocalDateTime.now().toString());
        mapper.insert(job);

        // 异步触发 SeaTunnel 同步（源库 -> 本地磁盘 Iceberg）
        String sysId = job.getSystemId() != null ? job.getSystemId() : "";
        String sysName = job.getSystemName() != null ? job.getSystemName() : "";
        String triggeredBy = job.getTriggeredBy() != null ? job.getTriggeredBy() : "Manual";
        seatunnel.triggerSync(sysId, sysName, job.getId(), triggeredBy);

        return Result.success(toMap(mapper.selectById(job.getId())));
    }

    @GetMapping("/jobs/{id}")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        RSyncJob job = mapper.selectById(id);
        if (job == null) return Result.fail(404, "任务不存在");
        return Result.success(toMap(job));
    }

    @PostMapping("/jobs/{id}/cancel")
    public Result<Void> cancel(@PathVariable String id) {
        RSyncJob job = mapper.selectById(id);
        if (job != null) { job.setStatus("cancelled"); mapper.updateById(job); }
        return Result.success(null);
    }

    @GetMapping("/jobs/{id}/logs")
    public Result<List<Map<String,Object>>> logs(@PathVariable String id) {
        RSyncJob job = mapper.selectById(id);
        if (job == null) return Result.success(List.of());
        if (job.getLogs() != null && !job.getLogs().isEmpty()) return Result.success(job.getLogs());
        return Result.success(List.of(
            Map.<String,Object>of("time", job.getStartedAt() != null ? job.getStartedAt() : "", "level", "INFO", "message", "开始同步任务 " + job.getId()),
            Map.<String,Object>of("time", "", "level", "INFO", "message", "完成 " + job.getRecords() + " 行")
        ));
    }

    /** 判断系统是否已同步过（源库数据未变）。 */
    @GetMapping("/check-already-synced")
    @Operation(summary = "检查系统是否已同步（源库数据未变）")
    public Result<Map<String,Object>> checkAlreadySynced(@RequestParam String systemId) {
        return Result.success(seatunnel.checkAlreadySynced(systemId));
    }

    /** 某同步任务下各表的统计明细（表名/行数/大小）。 */
    @GetMapping("/jobs/{id}/tables")
    @Operation(summary = "同步任务的表级统计")
    public Result<List<Map<String,Object>>> tableStats(@PathVariable String id) {
        List<RSyncTableStat> stats = tableStatMapper.selectList(
                new LambdaQueryWrapper<RSyncTableStat>().eq(RSyncTableStat::getJobId, id));
        List<Map<String,Object>> list = stats.stream().map(s -> {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("jobId", s.getJobId());
            m.put("databaseName", s.getDatabaseName());
            m.put("tableName", s.getTableName());
            m.put("rowCount", s.getRowCount() != null ? s.getRowCount() : 0);
            m.put("sizeBytes", s.getSizeBytes() != null ? s.getSizeBytes() : 0);
            return m;
        }).collect(Collectors.toList());
        return Result.success(list);
    }

    private Map<String,Object> toMap(RSyncJob job) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", job.getId());
        m.put("systemId", job.getSystemId());
        m.put("systemName", job.getSystemName());
        m.put("type", job.getType());
        m.put("status", job.getStatus());
        m.put("startedAt", job.getStartedAt());
        m.put("duration", job.getDuration());
        m.put("records", job.getRecords() != null ? job.getRecords() : 0);
        m.put("triggeredBy", job.getTriggeredBy());
        return m;
    }

    private RSyncJob fromMap(Map<String,Object> body) {
        RSyncJob job = new RSyncJob();
        if (body.get("id") != null) job.setId(body.get("id").toString());
        job.setSystemId(str(body.get("systemId")));
        job.setSystemName(str(body.get("systemName")));
        job.setType(str(body.get("type")));
        job.setStatus(str(body.get("status")));
        job.setStartedAt(str(body.get("startedAt")));
        job.setDuration(str(body.get("duration")));
        if (body.get("records") instanceof Number n) job.setRecords(n.longValue());
        job.setTriggeredBy(str(body.get("triggeredBy")));
        return job;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
