-- ================================================================
-- RIMS Decommission - 定时同步 Job 配置
-- Flyway Migration V18__create_sync_job_config.sql
-- 每个系统可配置一个定时任务（cron），到点对已落盘数据执行生命周期保留删除。
-- ================================================================

CREATE TABLE `r_sync_job_config` (
    `id`           VARCHAR(64)  NOT NULL COMMENT '配置ID',
    `system_id`    VARCHAR(64)  DEFAULT NULL COMMENT '系统ID',
    `job_name`     VARCHAR(128) DEFAULT NULL COMMENT '任务名称',
    `cron_expr`    VARCHAR(128) NOT NULL COMMENT 'cron 表达式（Spring 6段）',
    `enabled`      TINYINT      NOT NULL DEFAULT 1 COMMENT '是否启用 1-是 0-否',
    `last_run_at`  DATETIME     DEFAULT NULL COMMENT '上次执行时间',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`      TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_sjc_system` (`system_id`),
    KEY `idx_sjc_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时同步Job配置';
