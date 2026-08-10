-- ================================================================
-- RIMS Decommission - 同步任务-表级统计
-- Flyway Migration V10__create_sync_table_stats.sql
-- 记录每次同步任务里每个表同步了多少行、多大（Iceberg 落盘扫描所得）
-- ================================================================

CREATE TABLE `r_sync_table_stat` (
    `id`           VARCHAR(64)  NOT NULL COMMENT '主键ID',
    `job_id`       VARCHAR(64)  NOT NULL COMMENT '同步任务ID（r_sync_job.id）',
    `system_id`    VARCHAR(64)  DEFAULT NULL COMMENT '系统ID',
    `database_name` VARCHAR(128) DEFAULT NULL COMMENT '源数据库名',
    `table_name`   VARCHAR(128) NOT NULL COMMENT '表名',
    `row_count`    BIGINT       NOT NULL DEFAULT 0 COMMENT '同步行数',
    `size_bytes`   BIGINT       NOT NULL DEFAULT 0 COMMENT '落盘大小（字节）',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`      TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_sync_table_stat_job` (`job_id`),
    KEY `idx_r_sync_table_stat_system` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步任务-表级统计表';
