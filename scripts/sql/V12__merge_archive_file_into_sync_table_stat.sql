-- ================================================================
-- RIMS Decommission - 合并 r_archive_file 到 r_sync_table_stat
-- Flyway Migration V12__merge_archive_file_into_sync_table_stat.sql
-- r_sync_table_stat 与 r_archive_file 表达同一件事（同步的每张表），
-- 保留 r_sync_table_stat，补充归档相关字段后删除 r_archive_file。
-- ================================================================

-- 1) r_sync_table_stat 补充归档字段（来自 r_archive_file）
ALTER TABLE `r_sync_table_stat`
    ADD COLUMN `schema_name` VARCHAR(128) DEFAULT NULL COMMENT '源 Schema 名',
    ADD COLUMN `blob_url`    VARCHAR(512) DEFAULT NULL COMMENT '归档对象地址（ADLS/Blob/Iceberg）',
    ADD COLUMN `checksum`    VARCHAR(128) DEFAULT NULL COMMENT '校验和',
    ADD COLUMN `etag`        VARCHAR(128) DEFAULT NULL COMMENT '存储 ETag',
    ADD COLUMN `created_on`  DATETIME     DEFAULT NULL COMMENT '归档创建时间';

-- 2) 迁移既有 r_archive_file 数据到 r_sync_table_stat（按 表名+job_id 匹配，避免重复）
INSERT INTO `r_sync_table_stat`
    (`id`, `job_id`, `system_id`, `database_name`, `table_name`, `row_count`, `size_bytes`,
     `schema_name`, `blob_url`, `checksum`, `etag`, `created_on`, `created_at`, `updated_at`, `deleted`)
SELECT CONCAT('st-mig-', a.id),
       COALESCE(a.archive_batch_id, 'job-mig'),
       NULL,
       a.schema_name,
       a.table_name,
       0,
       a.size_bytes,
       a.schema_name,
       a.blob_url,
       a.checksum,
       a.etag,
       a.created_on,
       a.created_at,
       a.updated_at,
       a.deleted
FROM `r_archive_file` a
WHERE NOT EXISTS (
    SELECT 1 FROM `r_sync_table_stat` s
    WHERE s.table_name = a.table_name
      AND s.job_id = a.archive_batch_id
);

-- 3) 删除已合并的 r_archive_file
DROP TABLE `r_archive_file`;
