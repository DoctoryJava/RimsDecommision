-- ================================================================
-- RIMS Decommission - Query Config 归属 System
-- Flyway Migration V11__add_query_config_system.sql（SQL Server 版）
-- ================================================================

ALTER TABLE [r_query_config]
    ADD [system_id] NVARCHAR(64) NULL;  -- 所属系统ID（r_system.id）
GO

-- MySQL 的 ALTER TABLE ... ADD KEY 在 SQL Server 中用独立的 CREATE INDEX
CREATE INDEX [idx_r_query_config_system] ON [r_query_config] ([system_id]);
