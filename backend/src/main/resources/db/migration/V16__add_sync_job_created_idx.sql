-- ================================================================
-- RIMS Decommission - 修复 r_sync_job 排序内存溢出
-- Flyway Migration V16__add_sync_job_created_idx.sql
-- 列表页 ORDER BY created_at DESC 因无索引走 filesort，而 logs 为 JSON 大字段，
-- 导致 "Out of sort memory" (error 1038)。添加 (deleted, created_at) 复合索引，
-- 让排序走索引、避免 filesort 加载大字段。
-- ================================================================

ALTER TABLE `r_sync_job`
    ADD KEY `idx_r_sync_job_deleted_created` (`deleted`, `created_at`);
