-- ================================================================
-- RIMS Decommission - 仪表盘聚合数据表
-- Flyway Migration V7__create_dashboard_tables.sql
-- 用于仪表盘「同步活跃度」等聚合展示，替代前端 mock 数据。
-- ================================================================

-- 同步活跃度（按日聚合）
CREATE TABLE `r_sync_activity` (
    `id`            VARCHAR(64) NOT NULL COMMENT '记录ID',
    `day_label`     VARCHAR(16) NOT NULL COMMENT '星期标签（Mon/Sun 等）',
    `activity_date` DATE        DEFAULT NULL COMMENT '日期（用于排序/过滤）',
    `success_count` INT         NOT NULL DEFAULT 0 COMMENT '成功任务数',
    `failed_count`  INT         NOT NULL DEFAULT 0 COMMENT '失败任务数',
    `partial_count` INT         NOT NULL DEFAULT 0 COMMENT '部分成功任务数',
    `running_count` INT         NOT NULL DEFAULT 0 COMMENT '运行中任务数',
    `created_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`       TINYINT     NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_sync_activity_day` (`day_label`),
    KEY `idx_r_sync_activity_date` (`activity_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步活跃度表';
