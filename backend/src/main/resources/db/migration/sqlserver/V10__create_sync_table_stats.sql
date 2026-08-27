-- ================================================================
-- RIMS Decommission - 同步任务-表级统计
-- Flyway Migration V10__create_sync_table_stats.sql（SQL Server 版）
-- 记录每次同步任务里每个表同步了多少行、多大（Iceberg 落盘扫描所得）
-- ================================================================

-- 同步任务-表级统计表
CREATE TABLE [r_sync_table_stat] (
    [id] NVARCHAR(64) NOT NULL,    -- 主键ID
    [job_id] NVARCHAR(64) NOT NULL,    -- 同步任务ID（r_sync_job.id）
    [system_id] NVARCHAR(64) NULL,    -- 系统ID
    [database_name] NVARCHAR(128) NULL,    -- 源数据库名
    [table_name] NVARCHAR(128) NOT NULL,    -- 表名
    [row_count] BIGINT NOT NULL CONSTRAINT [df_r_sync_table_stat_row_count] DEFAULT 0,    -- 同步行数
    [size_bytes] BIGINT NOT NULL CONSTRAINT [df_r_sync_table_stat_size_bytes] DEFAULT 0,    -- 落盘大小（字节）
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_table_stat_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_table_stat_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_sync_table_stat_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_sync_table_stat] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_sync_table_stat_job] ON [r_sync_table_stat] ([job_id]);
CREATE INDEX [idx_r_sync_table_stat_system] ON [r_sync_table_stat] ([system_id]);
