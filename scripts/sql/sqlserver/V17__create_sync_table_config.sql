-- ================================================================
-- RIMS Decommission - 同步前表级配置（表选择 + 生命周期保留策略）
-- Flyway Migration V17__create_sync_table_config.sql（SQL Server 版）
-- 每个源库的每张表可配置：
--   enabled     : 是否同步该表
--   date_column : 用于判断"哪一年数据"的时间字段
--   retain_years: 保留最近 N 年（如保留 5 年，同步时删除 5 年前的数据）
-- ================================================================

-- 同步前表级配置（表选择+生命周期保留策略）
CREATE TABLE [r_sync_table_config] (
    [id] NVARCHAR(64) NOT NULL,    -- 配置ID
    [system_id] NVARCHAR(64) NULL,    -- 系统ID
    [source_database_id] NVARCHAR(64) NULL,    -- 源数据库ID（r_source_database.id）
    [table_name] NVARCHAR(128) NOT NULL,    -- 表名
    [enabled] TINYINT NOT NULL CONSTRAINT [df_r_sync_table_config_enabled] DEFAULT 1,    -- 是否同步该表 1-是 0-否
    [date_column] NVARCHAR(128) NULL,    -- 时间字段（用于判断数据年份）
    [retain_years] INT NULL,    -- 保留最近N年（NULL=不按时间删除）
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_table_config_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_table_config_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_sync_table_config_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_sync_table_config] PRIMARY KEY ([id])
);
CREATE INDEX [idx_tsc_source] ON [r_sync_table_config] ([source_database_id]);
CREATE INDEX [idx_tsc_system] ON [r_sync_table_config] ([system_id]);
