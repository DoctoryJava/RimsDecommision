-- ================================================================
-- RIMS Decommission - 审计日志表
-- Flyway Migration V14__create_audit_log.sql
-- 记录用户执行的 SQL 查询与手动 ETL 任务：操作人、时间、SQL、执行结果等
-- ================================================================

CREATE TABLE `r_audit_log` (
    `id`          VARCHAR(64)  NOT NULL COMMENT '审计日志ID',
    `operator`    VARCHAR(128) DEFAULT NULL COMMENT '操作人',
    `action_type` VARCHAR(32)  NOT NULL COMMENT '操作类型：query=SQL查询 / etl=ETL同步任务',
    `sql_text`    TEXT         DEFAULT NULL COMMENT '执行的SQL或操作描述',
    `status`      VARCHAR(16)  NOT NULL DEFAULT 'started' COMMENT '执行结果：started/success/failed',
    `system_id`   VARCHAR(64)  DEFAULT NULL COMMENT '相关系统ID',
    `detail`      JSON         DEFAULT NULL COMMENT '附加信息（数据库/行数/时长/错误等）',
    `executed_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`     TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除 0-否 1-是',
    PRIMARY KEY (`id`),
    KEY `idx_audit_operator` (`operator`),
    KEY `idx_audit_type` (`action_type`),
    KEY `idx_audit_status` (`status`),
    KEY `idx_audit_time` (`executed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';
