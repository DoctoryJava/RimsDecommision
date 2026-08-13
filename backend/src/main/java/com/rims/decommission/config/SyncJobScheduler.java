package com.rims.decommission.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.entity.RSyncJobConfig;
import com.rims.decommission.mapper.RSyncJobConfigMapper;
import com.rims.decommission.service.SeaTunnelSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 定时同步 Job 调度器：每分钟检查所有启用的 job 配置，命中 cron 则执行该系统的生命周期保留删除。 */
@Component
public class SyncJobScheduler {

    private static final Logger log = LoggerFactory.getLogger(SyncJobScheduler.class);

    private final RSyncJobConfigMapper jobConfigMapper;
    private final SeaTunnelSyncService seaTunnelSyncService;

    public SyncJobScheduler(RSyncJobConfigMapper jobConfigMapper, SeaTunnelSyncService seaTunnelSyncService) {
        this.jobConfigMapper = jobConfigMapper;
        this.seaTunnelSyncService = seaTunnelSyncService;
    }

    /** 每分钟跑一次：找到 cron 已到点且上次未执行过的 job，触发保留删除。 */
    @Scheduled(cron = "0 * * * * *")
    public void checkAndRunJobs() {
        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        var jobs = jobConfigMapper.selectList(new LambdaQueryWrapper<RSyncJobConfig>()
                .eq(RSyncJobConfig::getEnabled, 1));
        for (RSyncJobConfig j : jobs) {
            try {
                CronExpression ce = CronExpression.parse(j.getCronExpr());
                LocalDateTime last = j.getLastRunAt();
                LocalDateTime next = ce.next(last != null ? last : now.minusMinutes(1));
                // 若 cron 的下一次执行时间 <= 当前时间，说明该分钟到点
                if (next != null && !next.isAfter(now)) {
                    if (j.getSystemId() != null && !j.getSystemId().isBlank()) {
                        log.info("[SyncJobScheduler] 触发系统 {} 的生命周期保留删除 (job={}, cron={})",
                                j.getSystemId(), j.getJobName(), j.getCronExpr());
                        seaTunnelSyncService.runRetentionForSystem(j.getSystemId());
                        j.setLastRunAt(now);
                        jobConfigMapper.updateById(j);
                    }
                }
            } catch (Exception e) {
                log.warn("[SyncJobScheduler] job {} 校验失败: {}", j.getId(), e.getMessage());
            }
        }
    }
}
