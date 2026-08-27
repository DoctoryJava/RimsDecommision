-- ================================================================
-- RIMS Decommission - 审计日志表
-- Flyway Migration V14__create_audit_log.sql（SQL Server 版）
-- 记录用户执行的 SQL 查询与手动 ETL 任务：操作人、时间、SQL、执行结果等
-- ================================================================

-- 审计日志表
CREATE TABLE [r_audit_log] (
    [id] NVARCHAR(64) NOT NULL,    -- 审计日志ID
    [operator] NVARCHAR(128) NULL,    -- 操作人
    [action_type] NVARCHAR(32) NOT NULL,    -- 操作类型：query=SQL查询 / etl=ETL同步任务
    [sql_text] NVARCHAR(MAX) NULL,    -- 执行的SQL或操作描述
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [df_r_audit_log_status] DEFAULT 'started',    -- 执行结果：started/success/failed
    [system_id] NVARCHAR(64) NULL,    -- 相关系统ID
    [detail] NVARCHAR(MAX) NULL,    -- 附加信息（数据库/行数/时长/错误等）
    [executed_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_audit_log_executed_at] DEFAULT SYSDATETIME(),    -- 执行时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_audit_log_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_audit_log_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_audit_log_deleted] DEFAULT 0,    -- 逻辑删除 0-否 1-是
    CONSTRAINT [pk_r_audit_log] PRIMARY KEY ([id])
);
CREATE INDEX [idx_audit_operator] ON [r_audit_log] ([operator]);
CREATE INDEX [idx_audit_type] ON [r_audit_log] ([action_type]);
CREATE INDEX [idx_audit_status] ON [r_audit_log] ([status]);
CREATE INDEX [idx_audit_time] ON [r_audit_log] ([executed_at]);
