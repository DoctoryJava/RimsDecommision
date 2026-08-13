package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RSyncJobConfig;
import com.rims.decommission.mapper.RSyncJobConfigMapper;
import com.rims.decommission.service.SeaTunnelSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/sync-job-configs")
@Tag(name = "定时同步Job配置")
public class SyncJobConfigController {

    private final RSyncJobConfigMapper mapper;
    private final SeaTunnelSyncService seaTunnelSyncService;

    public SyncJobConfigController(RSyncJobConfigMapper mapper, SeaTunnelSyncService seaTunnelSyncService) {
        this.mapper = mapper;
        this.seaTunnelSyncService = seaTunnelSyncService;
    }

    /** 手动立即执行一次该 job（触发对应系统的生命周期保留删除）。 */
    @PostMapping("/{id}/run")
    @Operation(summary = "手动立即执行一次（对系统已落盘数据做保留删除）")
    public Result<Map<String,Object>> runNow(@PathVariable String id) {
        RSyncJobConfig j = mapper.selectById(id);
        if (j == null) return Result.fail(404, "配置不存在");
        if (j.getSystemId() == null || j.getSystemId().isBlank()) return Result.fail(400, "该 job 未绑定系统");
        seaTunnelSyncService.runRetentionForSystem(j.getSystemId());
        return Result.success(Map.of("systemId", j.getSystemId(), "started", true));
    }

    @GetMapping
    @Operation(summary = "所有定时同步Job配置（可按系统筛选）")
    public Result<List<Map<String,Object>>> list(@RequestParam(required = false) String systemId) {
        LambdaQueryWrapper<RSyncJobConfig> w = new LambdaQueryWrapper<RSyncJobConfig>()
                .orderByDesc(RSyncJobConfig::getCreatedAt);
        if (systemId != null && !systemId.isBlank()) w.eq(RSyncJobConfig::getSystemId, systemId);
        return Result.success(mapper.selectList(w).stream().map(this::toMap).toList());
    }

    @PostMapping
    @Operation(summary = "新建定时同步Job配置")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        String cron = str(body.get("cronExpr"));
        if (cron == null || cron.isBlank()) return Result.fail(400, "cron 表达式不能为空");
        if (!CronExpression.isValidExpression(cron)) return Result.fail(400, "cron 表达式无效");
        RSyncJobConfig j = new RSyncJobConfig();
        j.setId("sjc-" + System.currentTimeMillis());
        j.setSystemId(str(body.get("systemId")));
        j.setJobName(str(body.get("jobName")));
        j.setCronExpr(cron);
        j.setEnabled(body.get("enabled") instanceof Boolean b && b ? 1 : 0);
        mapper.insert(j);
        return Result.success(toMap(mapper.selectById(j.getId())));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新定时同步Job配置")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RSyncJobConfig j = mapper.selectById(id);
        if (j == null) return Result.fail(404, "配置不存在");
        String cron = str(body.get("cronExpr"));
        if (cron != null && !cron.isBlank() && !CronExpression.isValidExpression(cron)) return Result.fail(400, "cron 表达式无效");
        if (cron != null && !cron.isBlank()) j.setCronExpr(cron);
        if (body.get("jobName") != null) j.setJobName(str(body.get("jobName")));
        if (body.get("enabled") instanceof Boolean b) j.setEnabled(b ? 1 : 0);
        mapper.updateById(j);
        return Result.success(toMap(mapper.selectById(id)));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        mapper.deleteById(id);
        return Result.success(null);
    }

    private Map<String,Object> toMap(RSyncJobConfig j) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", j.getId());
        m.put("systemId", j.getSystemId());
        m.put("jobName", j.getJobName());
        m.put("cronExpr", j.getCronExpr());
        m.put("enabled", j.getEnabled() != null && j.getEnabled() == 1);
        m.put("lastRunAt", j.getLastRunAt() != null ? j.getLastRunAt().toString() : null);
        // 下次执行时间
        String next = null;
        try {
            CronExpression ce = CronExpression.parse(j.getCronExpr());
            LocalDateTime base = LocalDateTime.now();
            if (j.getLastRunAt() != null && j.getLastRunAt().isAfter(base)) base = j.getLastRunAt();
            LocalDateTime n = ce.next(base);
            if (n != null) next = n.toString();
        } catch (Exception ignored) {
        }
        m.put("nextRunAt", next);
        return m;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
