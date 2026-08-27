-- ================================================================
-- RIMS Decommission - 修复 r_sync_job 排序性能
-- Flyway Migration V16__add_sync_job_created_idx.sql（SQL Server 版）
-- 列表页 ORDER BY created_at DESC 无索引时需全表排序，而 logs 为 NVARCHAR(MAX) 大字段，
-- 排序开销很大。添加 (deleted, created_at) 复合索引，让排序走索引。
-- ================================================================

CREATE INDEX [idx_r_sync_job_deleted_created] ON [r_sync_job] ([deleted], [created_at]);
