-- ================================================================
-- RIMS Decommission - 定时同步 Job 配置
-- Flyway Migration V18__create_sync_job_config.sql（SQL Server 版）
-- 每个系统可配置一个定时任务（cron），到点对已落盘数据执行生命周期保留删除。
-- ================================================================

-- 定时同步Job配置
CREATE TABLE [r_sync_job_config] (
    [id] NVARCHAR(64) NOT NULL,    -- 配置ID
    [system_id] NVARCHAR(64) NULL,    -- 系统ID
    [job_name] NVARCHAR(128) NULL,    -- 任务名称
    [cron_expr] NVARCHAR(128) NOT NULL,    -- cron 表达式（Spring 6段）
    [enabled] TINYINT NOT NULL CONSTRAINT [df_r_sync_job_config_enabled] DEFAULT 1,    -- 是否启用 1-是 0-否
    [last_run_at] DATETIME2(3) NULL,    -- 上次执行时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_job_config_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_job_config_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_sync_job_config_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_sync_job_config] PRIMARY KEY ([id])
);
CREATE INDEX [idx_sjc_system] ON [r_sync_job_config] ([system_id]);
CREATE INDEX [idx_sjc_enabled] ON [r_sync_job_config] ([enabled]);
