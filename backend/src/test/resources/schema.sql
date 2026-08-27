-- H2 (MODE=MSSQLServer) 测试库结构 —— 与 db/migration/sqlserver 下的迁移脚本对应
-- 与生产 SQL Server 脚本的两点差异（H2 限制，仅影响测试）：
--   1) 生产用 NVARCHAR(MAX) 存 JSON，H2 无 MAX，这里用 NVARCHAR(4000)
--   2) 用 CREATE TABLE IF NOT EXISTS 保证重复初始化幂等（T-SQL 无此语法）
CREATE TABLE IF NOT EXISTS [r_user] (
    [id]         NVARCHAR(64) PRIMARY KEY,
    [name]       NVARCHAR(128) NOT NULL,
    [email]      NVARCHAR(128) NOT NULL,
    [password]   NVARCHAR(256) NOT NULL,
    [avatar]     NVARCHAR(16),
    [role_code]  NVARCHAR(64)  NOT NULL,
    [category]   NVARCHAR(32)  NOT NULL,
    [system_ids] NVARCHAR(4000),
    [status]     NVARCHAR(16)  NOT NULL DEFAULT 'active',
    [last_login] DATETIME2,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]    TINYINT  NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_user_email ON [r_user]([email]);

CREATE TABLE IF NOT EXISTS [r_role] (
    [id]          NVARCHAR(64) PRIMARY KEY,
    [role_key]    NVARCHAR(64) NOT NULL,
    [name]        NVARCHAR(128) NOT NULL,
    [description] NVARCHAR(512),
    [user_count]  INT NOT NULL DEFAULT 0,
    [permissions] NVARCHAR(4000),
    [category]    NVARCHAR(32) NOT NULL,
    [color]       NVARCHAR(32),
    [is_builtin]  TINYINT NOT NULL DEFAULT 1,
    [created_at]  DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at]  DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]     TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_role_key ON [r_role]([role_key]);

CREATE TABLE IF NOT EXISTS [r_permission] (
    [id]          NVARCHAR(64) PRIMARY KEY,
    [code]        NVARCHAR(128) NOT NULL,
    [name]        NVARCHAR(128),
    [module]      NVARCHAR(64) NOT NULL,
    [action]      NVARCHAR(64) NOT NULL,
    [category]    NVARCHAR(32) NOT NULL,
    [description] NVARCHAR(512),
    [created_at]  DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at]  DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]     TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_permission_code ON [r_permission]([code]);

CREATE TABLE IF NOT EXISTS [r_page] (
    [id]          NVARCHAR(64) PRIMARY KEY,
    [name]        NVARCHAR(128) NOT NULL,
    [path]        NVARCHAR(256) NOT NULL,
    [module]      NVARCHAR(64) NOT NULL,
    [icon]        NVARCHAR(64),
    [visible_to]  NVARCHAR(4000),
    [sort_order]  INT NOT NULL DEFAULT 0,
    [enabled]     TINYINT NOT NULL DEFAULT 1,
    [created_at]  DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at]  DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]     TINYINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS [r_system] (
    [id]             NVARCHAR(64) PRIMARY KEY,
    [name]           NVARCHAR(128) NOT NULL,
    [code]           NVARCHAR(64) NOT NULL,
    [description]    NVARCHAR(512),
    [owner]          NVARCHAR(128),
    [department]     NVARCHAR(128),
    [stage]          NVARCHAR(32) NOT NULL,
    [status]         NVARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    [created_at]     DATE,
    [archived_at]    DATE,
    [db_config]      NVARCHAR(4000),
    [storage_config] NVARCHAR(4000),
    [last_sync]      NVARCHAR(64),
    [sync_status]    NVARCHAR(32),
    [schema_count]   INT NOT NULL DEFAULT 0,
    [table_count]    INT NOT NULL DEFAULT 0,
    [data_size_gb]   INT NOT NULL DEFAULT 0,
    [tags]           NVARCHAR(4000),
    [updated_at]     DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]        TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_system_code ON [r_system]([code]);

CREATE TABLE IF NOT EXISTS [r_sync_job] (
    [id]           NVARCHAR(64) PRIMARY KEY,
    [system_id]    NVARCHAR(64),
    [system_name]  NVARCHAR(128),
    [type]         NVARCHAR(32),
    [status]       NVARCHAR(32) NOT NULL DEFAULT 'syncing',
    [started_at]   NVARCHAR(64),
    [duration]     NVARCHAR(64),
    [records]      BIGINT NOT NULL DEFAULT 0,
    [triggered_by] NVARCHAR(128),
    [logs]         NVARCHAR(4000),
    [created_at]   DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at]   DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]      TINYINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS [r_schema] (
    [id]         NVARCHAR(64) PRIMARY KEY,
    [system_id]  NVARCHAR(64),
    [name]       NVARCHAR(128) NOT NULL,
    [tables]     NVARCHAR(4000),
    [synced_at]  NVARCHAR(64),
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]    TINYINT NOT NULL DEFAULT 0
);

-- [columns] / [rows] 为 ODBC 保留字，统一加方括号（SQL Server 与 H2 均可）
CREATE TABLE IF NOT EXISTS [r_physical_table] (
    [id]         NVARCHAR(64) PRIMARY KEY,
    [name]       NVARCHAR(128) NOT NULL,
    [label]      NVARCHAR(128),
    [system_id]  NVARCHAR(64),
    [columns]    NVARCHAR(4000),
    [rows]       NVARCHAR(4000),
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]    TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_physical_table_name ON [r_physical_table]([name]);

-- [system_id] 由 V11__add_query_config_system.sql 追加，这里直接并入建表语句
CREATE TABLE IF NOT EXISTS [r_query_config] (
    [id]           NVARCHAR(64) PRIMARY KEY,
    [name]         NVARCHAR(128) NOT NULL,
    [description]  NVARCHAR(512),
    [base_table]   NVARCHAR(128) NOT NULL,
    [joins]        NVARCHAR(4000),
    [fields]       NVARCHAR(4000),
    [default_sort] NVARCHAR(4000),
    [page_size]    INT NOT NULL DEFAULT 10,
    [status]       NVARCHAR(32) NOT NULL DEFAULT 'active',
    [created_by]   NVARCHAR(128),
    [created_at]   DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [updated_at]   DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [deleted]      TINYINT NOT NULL DEFAULT 0,
    [system_id]    NVARCHAR(64)
);

-- ========== 扩展表（V5，对齐 db/migration/sqlserver/V5__create_r_extended_tables.sql） ==========
CREATE TABLE IF NOT EXISTS [r_source_database] (
    [id] NVARCHAR(64) PRIMARY KEY, [source_system_id] NVARCHAR(64) NOT NULL,
    [db_type] NVARCHAR(32) NOT NULL, [server] NVARCHAR(255), [database_name] NVARCHAR(128) NOT NULL,
    [connection_secret_ref] NVARCHAR(512), [conn_string_hash] NVARCHAR(128), [description] NVARCHAR(512),
    [port] INT NOT NULL DEFAULT 0, [username] NVARCHAR(128), [password] NVARCHAR(256),
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_unstructured_source] (
    [id] NVARCHAR(64) PRIMARY KEY, [source_system_id] NVARCHAR(64) NOT NULL, [source_type] NVARCHAR(32) NOT NULL,
    [location_uri] NVARCHAR(512), [mount_path] NVARCHAR(255), [file_pattern] NVARCHAR(255),
    [date_extraction_rule] NVARCHAR(255), [description] NVARCHAR(512),
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_unstructured_item] (
    [id] NVARCHAR(64) PRIMARY KEY, [unstructured_source_id] NVARCHAR(64) NOT NULL, [original_path] NVARCHAR(512),
    [original_name] NVARCHAR(255) NOT NULL, [size_bytes] BIGINT NOT NULL DEFAULT 0, [content_type] NVARCHAR(128),
    [last_modified] DATETIME2, [derived_date] DATE, [hash] NVARCHAR(128),
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_archive_batch] (
    [id] NVARCHAR(64) PRIMARY KEY, [archive_job_id] NVARCHAR(64) NOT NULL, [batch_year] INT,
    [started_at] DATETIME2, [finished_at] DATETIME2, [rows_out] BIGINT NOT NULL DEFAULT 0, [bytes_out] BIGINT NOT NULL DEFAULT 0,
    [result] NVARCHAR(32) NOT NULL DEFAULT 'RUNNING', [log_url] NVARCHAR(512), [correlation_id] NVARCHAR(64),
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_archive_set] (
    [id] NVARCHAR(64) PRIMARY KEY, [archive_batch_id] NVARCHAR(64) NOT NULL, [set_name] NVARCHAR(128) NOT NULL,
    [blob_dir_url] NVARCHAR(512), [items_count] INT NOT NULL DEFAULT 0, [bytes_total] BIGINT NOT NULL DEFAULT 0, [created_on] DATETIME2,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_archive_set_item] (
    [id] NVARCHAR(64) PRIMARY KEY, [archive_set_id] NVARCHAR(64) NOT NULL, [original_path] NVARCHAR(512),
    [original_name] NVARCHAR(255) NOT NULL, [blob_url] NVARCHAR(512), [size_bytes] BIGINT NOT NULL DEFAULT 0,
    [checksum] NVARCHAR(128), [content_type] NVARCHAR(128), [copied_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_retention_policy] (
    [id] NVARCHAR(64) PRIMARY KEY, [code] NVARCHAR(64) NOT NULL, [name] NVARCHAR(128) NOT NULL,
    [description] NVARCHAR(512), [period_days] INT NOT NULL, [start_trigger] NVARCHAR(32) NOT NULL DEFAULT 'SYNC_COMPLETED', [created_on] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_retention_code ON [r_retention_policy]([code]);

CREATE TABLE IF NOT EXISTS [r_retention_assignment] (
    [id] NVARCHAR(64) PRIMARY KEY, [policy_id] NVARCHAR(64) NOT NULL, [object_type] NVARCHAR(32) NOT NULL,
    [object_id] NVARCHAR(64) NOT NULL, [start_date] DATE, [due_date] DATE, [status] NVARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    [current_hold_start] DATETIME2, [current_hold_end] DATETIME2, [assigned_by] NVARCHAR(64), [created_on] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_legal_hold_event] (
    [id] NVARCHAR(64) PRIMARY KEY, [assignment_id] NVARCHAR(64) NOT NULL, [action] NVARCHAR(32) NOT NULL,
    [hold_start] DATETIME2, [hold_end] DATETIME2, [reason] NVARCHAR(512), [actor_id] NVARCHAR(64), [ts] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS [r_tag] (
    [id] NVARCHAR(64) PRIMARY KEY, [tag_key] NVARCHAR(128) NOT NULL, [tag_value] NVARCHAR(255),
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_tag_kv ON [r_tag]([tag_key], [tag_value]);

CREATE TABLE IF NOT EXISTS [r_object_tag] (
    [id] NVARCHAR(64) PRIMARY KEY, [object_type] NVARCHAR(32) NOT NULL, [object_id] NVARCHAR(64) NOT NULL,
    [tag_id] NVARCHAR(64) NOT NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_object_tag ON [r_object_tag]([object_type], [object_id], [tag_id]);

-- ========== 仪表盘表（V7） ==========
CREATE TABLE IF NOT EXISTS [r_sync_activity] (
    [id] NVARCHAR(64) PRIMARY KEY, [day_label] NVARCHAR(16) NOT NULL, [activity_date] DATE,
    [success_count] INT NOT NULL DEFAULT 0, [failed_count] INT NOT NULL DEFAULT 0,
    [partial_count] INT NOT NULL DEFAULT 0, [running_count] INT NOT NULL DEFAULT 0,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_sync_activity_day ON [r_sync_activity]([day_label]);

-- ========== 同步任务-表级统计表（V10） ==========
CREATE TABLE IF NOT EXISTS [r_sync_table_stat] (
    [id] NVARCHAR(64) PRIMARY KEY, [job_id] NVARCHAR(64) NOT NULL, [system_id] NVARCHAR(64),
    [database_name] NVARCHAR(128), [table_name] NVARCHAR(128) NOT NULL,
    [row_count] BIGINT NOT NULL DEFAULT 0, [size_bytes] BIGINT NOT NULL DEFAULT 0,
    [schema_name] NVARCHAR(128), [blob_url] NVARCHAR(512), [checksum] NVARCHAR(128), [etag] NVARCHAR(128), [created_on] DATETIME2,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_r_sync_table_stat_job ON [r_sync_table_stat]([job_id]);

-- ========== 下钻配置表（V13） ==========
CREATE TABLE IF NOT EXISTS [r_drill_config] (
    [id] NVARCHAR(64) PRIMARY KEY, [query_config_id] NVARCHAR(64) NOT NULL, [parent_id] NVARCHAR(64),
    [name] NVARCHAR(128) NOT NULL, [base_table] NVARCHAR(255) NOT NULL,
    [parent_field] NVARCHAR(128) NOT NULL, [child_field] NVARCHAR(128) NOT NULL,
    [fields] NVARCHAR(4000), [sort_order] INT NOT NULL DEFAULT 0,
    [created_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [updated_at] DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP, [deleted] TINYINT NOT NULL DEFAULT 0);
