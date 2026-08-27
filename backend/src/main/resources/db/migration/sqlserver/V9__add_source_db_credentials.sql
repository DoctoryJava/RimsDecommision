-- ================================================================
-- RIMS Decommission - 源数据库补充连接字段
-- Flyway Migration V9__add_source_db_credentials.sql（SQL Server 版）
-- 为 r_source_database 补充端口、账号、密码等连接信息
-- ================================================================

-- SQL Server 的 ALTER TABLE ADD 一次可加多列，但每列需自带 CONSTRAINT 名以便回滚
ALTER TABLE [r_source_database]
    ADD [port]     INT NOT NULL CONSTRAINT [df_r_source_database_port] DEFAULT 0,  -- 端口
        [username] NVARCHAR(128) NULL,                                             -- 账号
        [password] NVARCHAR(256) NULL;                                             -- 密码（加密存储）
GO

-- 更新既有种子数据的端口（可选）
UPDATE [r_source_database]
SET [port] = CASE [db_type]
    WHEN 'POSTGRESQL' THEN 5432
    WHEN 'ORACLE' THEN 1521
    WHEN 'SQLSERVER' THEN 1433
    WHEN 'MYSQL' THEN 3306
    WHEN 'MONGODB' THEN 27017
    ELSE 0 END
WHERE [port] = 0;
