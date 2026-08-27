-- ================================================================
-- RIMS Decommission - 仪表盘聚合数据表
-- Flyway Migration V7__create_dashboard_tables.sql（SQL Server 版）
-- 用于仪表盘「同步活跃度」等聚合展示，替代前端 mock 数据。
-- ================================================================

-- 同步活跃度（按日聚合）
-- 同步活跃度表
CREATE TABLE [r_sync_activity] (
    [id] NVARCHAR(64) NOT NULL,    -- 记录ID
    [day_label] NVARCHAR(16) NOT NULL,    -- 星期标签（Mon/Sun 等）
    [activity_date] DATE NULL,    -- 日期（用于排序/过滤）
    [success_count] INT NOT NULL CONSTRAINT [df_r_sync_activity_success_count] DEFAULT 0,    -- 成功任务数
    [failed_count] INT NOT NULL CONSTRAINT [df_r_sync_activity_failed_count] DEFAULT 0,    -- 失败任务数
    [partial_count] INT NOT NULL CONSTRAINT [df_r_sync_activity_partial_count] DEFAULT 0,    -- 部分成功任务数
    [running_count] INT NOT NULL CONSTRAINT [df_r_sync_activity_running_count] DEFAULT 0,    -- 运行中任务数
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_activity_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_activity_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_sync_activity_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_sync_activity] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_sync_activity_day] UNIQUE ([day_label])
);
CREATE INDEX [idx_r_sync_activity_date] ON [r_sync_activity] ([activity_date]);
