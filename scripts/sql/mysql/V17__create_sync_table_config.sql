-- ================================================================
-- RIMS Decommission - 同步前表级配置（表选择 + 生命周期保留策略）
-- Flyway Migration V17__create_sync_table_config.sql
-- 每个源库的每张表可配置：
--   enabled     : 是否同步该表
--   date_column : 用于判断"哪一年数据"的时间字段
--   retain_years: 保留最近 N 年（如保留 5 年，同步时删除 5 年前的数据）
-- ================================================================

CREATE TABLE `r_sync_table_config` (
    `id`                 VARCHAR(64)  NOT NULL COMMENT '配置ID',
    `system_id`          VARCHAR(64)  DEFAULT NULL COMMENT '系统ID',
    `source_database_id` VARCHAR(64)  DEFAULT NULL COMMENT '源数据库ID（r_source_database.id）',
    `table_name`         VARCHAR(128) NOT NULL COMMENT '表名',
    `enabled`            TINYINT      NOT NULL DEFAULT 1 COMMENT '是否同步该表 1-是 0-否',
    `date_column`        VARCHAR(128) DEFAULT NULL COMMENT '时间字段（用于判断数据年份）',
    `retain_years`       INT          DEFAULT NULL COMMENT '保留最近N年（NULL=不按时间删除）',
    `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`            TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_tsc_source` (`source_database_id`),
    KEY `idx_tsc_system` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步前表级配置（表选择+生命周期保留策略）';
