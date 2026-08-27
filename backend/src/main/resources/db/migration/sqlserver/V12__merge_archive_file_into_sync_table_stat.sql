-- ================================================================
-- RIMS Decommission - 合并 r_archive_file 到 r_sync_table_stat
-- Flyway Migration V12__merge_archive_file_into_sync_table_stat.sql（SQL Server 版）
-- r_sync_table_stat 与 r_archive_file 表达同一件事（同步的每张表），
-- 保留 r_sync_table_stat，补充归档相关字段后删除 r_archive_file。
-- ================================================================

-- 1) r_sync_table_stat 补充归档字段（来自 r_archive_file）
ALTER TABLE [r_sync_table_stat]
    ADD [schema_name] NVARCHAR(128) NULL,   -- 源 Schema 名
        [blob_url]    NVARCHAR(512) NULL,   -- 归档对象地址（ADLS/Blob/Iceberg）
        [checksum]    NVARCHAR(128) NULL,   -- 校验和
        [etag]        NVARCHAR(128) NULL,   -- 存储 ETag
        [created_on]  DATETIME2(3)  NULL;   -- 归档创建时间
GO

-- 2) 迁移既有 r_archive_file 数据到 r_sync_table_stat（按 表名+job_id 匹配，避免重复）
--    MySQL 的 CONCAT('st-mig-', a.id) 在 T-SQL 用 + 拼接（列已是 NVARCHAR）
INSERT INTO [r_sync_table_stat]
    ([id], [job_id], [system_id], [database_name], [table_name], [row_count], [size_bytes],
     [schema_name], [blob_url], [checksum], [etag], [created_on], [created_at], [updated_at], [deleted])
SELECT N'st-mig-' + a.[id],
       COALESCE(a.[archive_batch_id], 'job-mig'),
       NULL,
       a.[schema_name],
       a.[table_name],
       0,
       a.[size_bytes],
       a.[schema_name],
       a.[blob_url],
       a.[checksum],
       a.[etag],
       a.[created_on],
       a.[created_at],
       a.[updated_at],
       a.[deleted]
FROM [r_archive_file] a
WHERE NOT EXISTS (
    SELECT 1 FROM [r_sync_table_stat] s
    WHERE s.[table_name] = a.[table_name]
      AND s.[job_id] = a.[archive_batch_id]
);
GO

-- 3) 删除已合并的 r_archive_file
DROP TABLE [r_archive_file];
