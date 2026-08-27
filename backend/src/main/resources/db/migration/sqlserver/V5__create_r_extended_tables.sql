-- ================================================================
-- RIMS Decommission - 补充设计图中缺失的表（以 r_ 开头）
-- 对应 Mermaid 类图：SourceDatabase / UnstructuredSource /
-- UnstructuredItem / ArchiveBatch / ArchiveFile / ArchiveSet /
-- ArchiveSetItem / RetentionPolicy / RetentionAssignment /
-- LegalHoldEvent / Tag / ObjectTag
-- 关联：SourceSystem↔r_system，ArchiveJob↔r_sync_job
-- ================================================================

-- ========== 源数据库（SourceDatabase）==========
-- 一个退役系统可拥有多个源数据库。现 r_system.db_config 仅存单一内联 JSON，
-- 此表将其提升为一等实体以支持多库与密钥引用。
-- 源数据库表
CREATE TABLE [r_source_database] (
    [id] NVARCHAR(64) NOT NULL,    -- 源数据库ID
    [source_system_id] NVARCHAR(64) NOT NULL,    -- 所属系统ID（r_system.id）
    [db_type] NVARCHAR(32) NOT NULL,    -- 数据库类型：MYSQL/ORACLE/POSTGRESQL/SQLSERVER/MONGODB
    [server] NVARCHAR(255) NULL,    -- 服务器地址
    [database_name] NVARCHAR(128) NOT NULL,    -- 数据库名
    [connection_secret_ref] NVARCHAR(512) NULL,    -- 连接凭据的密钥引用（Key Vault/Secret Scope）
    [conn_string_hash] NVARCHAR(128) NULL,    -- 连接串哈希（用于变更检测）
    [description] NVARCHAR(512) NULL,    -- 描述
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_source_database_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_source_database_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_source_database_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_source_database] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_source_db_system] ON [r_source_database] ([source_system_id]);


-- ========== 非结构化数据源（UnstructuredSource）==========
-- 非结构化数据源表
CREATE TABLE [r_unstructured_source] (
    [id] NVARCHAR(64) NOT NULL,    -- 非结构化源ID
    [source_system_id] NVARCHAR(64) NOT NULL,    -- 所属系统ID（r_system.id）
    [source_type] NVARCHAR(32) NOT NULL,    -- 类型：FILE_SHARE/AZURE_BLOB/AWS_S3/ADLS/MINIO
    [location_uri] NVARCHAR(512) NULL,    -- 源位置 URI
    [mount_path] NVARCHAR(255) NULL,    -- 挂载路径
    [file_pattern] NVARCHAR(255) NULL,    -- 文件匹配模式（如 *.pdf）
    [date_extraction_rule] NVARCHAR(255) NULL,    -- 归档日期提取规则（从文件名/路径/属性）
    [description] NVARCHAR(512) NULL,    -- 描述
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_unstructured_source_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_unstructured_source_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_unstructured_source_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_unstructured_source] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_unstruct_src_system] ON [r_unstructured_source] ([source_system_id]);


-- ========== 非结构化条目（UnstructuredItem）==========
-- 非结构化条目表
CREATE TABLE [r_unstructured_item] (
    [id] NVARCHAR(64) NOT NULL,    -- 条目ID
    [unstructured_source_id] NVARCHAR(64) NOT NULL,    -- 所属非结构化源ID（r_unstructured_source.id）
    [original_path] NVARCHAR(512) NULL,    -- 原始路径
    [original_name] NVARCHAR(255) NOT NULL,    -- 原始文件名
    [size_bytes] BIGINT NOT NULL CONSTRAINT [df_r_unstructured_item_size_bytes] DEFAULT 0,    -- 文件大小（字节）
    [content_type] NVARCHAR(128) NULL,    -- MIME 类型
    [last_modified] DATETIME2(3) NULL,    -- 源文件最后修改时间
    [derived_date] DATE NULL,    -- 推导出的归档归属日期
    [hash] NVARCHAR(128) NULL,    -- 内容哈希（用于去重/校验）
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_unstructured_item_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_unstructured_item_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_unstructured_item_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_unstructured_item] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_unstruct_item_source] ON [r_unstructured_item] ([unstructured_source_id]);


-- ========== 归档批次（ArchiveBatch）==========
-- 一次 ArchiveJob 执行产生一个批次，记录吞吐与结果；一个 Job 可有多个批次（按年/周期）。
-- 归档批次表
CREATE TABLE [r_archive_batch] (
    [id] NVARCHAR(64) NOT NULL,    -- 批次ID
    [archive_job_id] NVARCHAR(64) NOT NULL,    -- 归档任务ID（r_sync_job.id）
    [batch_year] INT NULL,    -- 归档归属年份（按日期切片）
    [started_at] DATETIME2(3) NULL,    -- 开始时间
    [finished_at] DATETIME2(3) NULL,    -- 结束时间
    [rows_out] BIGINT NOT NULL CONSTRAINT [df_r_archive_batch_rows_out] DEFAULT 0,    -- 输出行数
    [bytes_out] BIGINT NOT NULL CONSTRAINT [df_r_archive_batch_bytes_out] DEFAULT 0,    -- 输出字节数
    [result] NVARCHAR(32) NOT NULL CONSTRAINT [df_r_archive_batch_result] DEFAULT 'RUNNING',    -- 结果：RUNNING/SUCCESS/FAILED/PARTIAL
    [log_url] NVARCHAR(512) NULL,    -- 运行日志 URL
    [correlation_id] NVARCHAR(64) NULL,    -- 关联 ID（分布式追踪）
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_batch_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_batch_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_archive_batch_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_archive_batch] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_batch_job] ON [r_archive_batch] ([archive_job_id]);


-- ========== 归档文件（ArchiveFile，结构化表归档产物）==========
-- 归档文件表
CREATE TABLE [r_archive_file] (
    [id] NVARCHAR(64) NOT NULL,    -- 归档文件ID
    [archive_batch_id] NVARCHAR(64) NOT NULL,    -- 所属批次ID（r_archive_batch.id）
    [schema_name] NVARCHAR(128) NULL,    -- 源 Schema 名
    [table_name] NVARCHAR(128) NOT NULL,    -- 源表名
    [blob_url] NVARCHAR(512) NOT NULL,    -- 归档对象地址（ADLS/Blob/Iceberg 文件）
    [size_bytes] BIGINT NOT NULL CONSTRAINT [df_r_archive_file_size_bytes] DEFAULT 0,    -- 文件大小（字节）
    [checksum] NVARCHAR(128) NULL,    -- 校验和
    [etag] NVARCHAR(128) NULL,    -- 存储 ETag
    [created_on] DATETIME2(3) NULL,    -- 归档创建时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_file_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_file_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_archive_file_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_archive_file] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_archive_file_batch] ON [r_archive_file] ([archive_batch_id]);


-- ========== 归档集（ArchiveSet，非结构化文件集归档产物）==========
-- 归档集表
CREATE TABLE [r_archive_set] (
    [id] NVARCHAR(64) NOT NULL,    -- 归档集ID
    [archive_batch_id] NVARCHAR(64) NOT NULL,    -- 所属批次ID（r_archive_batch.id）
    [set_name] NVARCHAR(128) NOT NULL,    -- 归档集名称
    [blob_dir_url] NVARCHAR(512) NULL,    -- 归档集目录地址
    [items_count] INT NOT NULL CONSTRAINT [df_r_archive_set_items_count] DEFAULT 0,    -- 条目数量
    [bytes_total] BIGINT NOT NULL CONSTRAINT [df_r_archive_set_bytes_total] DEFAULT 0,    -- 总字节数
    [created_on] DATETIME2(3) NULL,    -- 创建时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_set_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_set_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_archive_set_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_archive_set] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_archive_set_batch] ON [r_archive_set] ([archive_batch_id]);


-- ========== 归档集条目（ArchiveSetItem）==========
-- 归档集条目表
CREATE TABLE [r_archive_set_item] (
    [id] NVARCHAR(64) NOT NULL,    -- 条目ID
    [archive_set_id] NVARCHAR(64) NOT NULL,    -- 所属归档集ID（r_archive_set.id）
    [original_path] NVARCHAR(512) NULL,    -- 原始路径
    [original_name] NVARCHAR(255) NOT NULL,    -- 原始文件名
    [blob_url] NVARCHAR(512) NULL,    -- 归档对象地址
    [size_bytes] BIGINT NOT NULL CONSTRAINT [df_r_archive_set_item_size_bytes] DEFAULT 0,    -- 文件大小（字节）
    [checksum] NVARCHAR(128) NULL,    -- 校验和
    [content_type] NVARCHAR(128) NULL,    -- MIME 类型
    [copied_at] DATETIME2(3) NULL,    -- 复制时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_set_item_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_archive_set_item_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_archive_set_item_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_archive_set_item] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_archive_set_item_set] ON [r_archive_set_item] ([archive_set_id]);


-- ========== 保留策略（RetentionPolicy）==========
-- 保留策略表
CREATE TABLE [r_retention_policy] (
    [id] NVARCHAR(64) NOT NULL,    -- 策略ID
    [code] NVARCHAR(64) NOT NULL,    -- 策略编码（唯一）
    [name] NVARCHAR(128) NOT NULL,    -- 策略名称
    [description] NVARCHAR(512) NULL,    -- 描述
    [period_days] INT NOT NULL,    -- 保留天数
    [start_trigger] NVARCHAR(32) NOT NULL CONSTRAINT [df_r_retention_policy_start_trigger] DEFAULT 'SYNC_COMPLETED',    -- 起算点：SYNC_COMPLETED/INGESTION_DATE/DEPLOYMENT_DATE
    [created_on] DATETIME2(3) NOT NULL CONSTRAINT [df_r_retention_policy_created_on] DEFAULT SYSDATETIME(),
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_retention_policy_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_retention_policy_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_retention_policy_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_retention_policy] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_retention_code] UNIQUE ([code])
);


-- ========== 保留指派（RetentionAssignment）==========
-- 将保留策略应用到某个对象（系统/表/文件集），计算起止日期并跟踪法定保留状态。
-- 保留指派表
CREATE TABLE [r_retention_assignment] (
    [id] NVARCHAR(64) NOT NULL,    -- 指派ID
    [policy_id] NVARCHAR(64) NOT NULL,    -- 保留策略ID（r_retention_policy.id）
    [object_type] NVARCHAR(32) NOT NULL,    -- 对象类型：SYSTEM/TABLE/FILE_SET
    [object_id] NVARCHAR(64) NOT NULL,    -- 对象ID
    [start_date] DATE NULL,    -- 保留起算日期
    [due_date] DATE NULL,    -- 到期日期
    [status] NVARCHAR(32) NOT NULL CONSTRAINT [df_r_retention_assignment_status] DEFAULT 'ACTIVE',    -- ACTIVE/EXPIRED/COMPLETED/ON_HOLD
    [current_hold_start] DATETIME2(3) NULL,    -- 当前法定保留开始
    [current_hold_end] DATETIME2(3) NULL,    -- 当前法定保留结束
    [assigned_by] NVARCHAR(64) NULL,    -- 指派人ID
    [created_on] DATETIME2(3) NOT NULL CONSTRAINT [df_r_retention_assignment_created_on] DEFAULT SYSDATETIME(),
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_retention_assignment_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_retention_assignment_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_retention_assignment_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_retention_assignment] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_retention_ass_policy] ON [r_retention_assignment] ([policy_id]);
CREATE INDEX [idx_r_retention_ass_obj] ON [r_retention_assignment] ([object_type], [object_id]);


-- ========== 法定保留事件（LegalHoldEvent）==========
-- 法定保留事件表
CREATE TABLE [r_legal_hold_event] (
    [id] NVARCHAR(64) NOT NULL,    -- 事件ID
    [assignment_id] NVARCHAR(64) NOT NULL,    -- 保留指派ID（r_retention_assignment.id）
    [action] NVARCHAR(32) NOT NULL,    -- 动作：HOLD/RELEASE
    [hold_start] DATETIME2(3) NULL,    -- 开始法定保留
    [hold_end] DATETIME2(3) NULL,    -- 结束法定保留
    [reason] NVARCHAR(512) NULL,    -- 原因/说明
    [actor_id] NVARCHAR(64) NULL,    -- 操作人ID
    [ts] DATETIME2(3) NOT NULL CONSTRAINT [df_r_legal_hold_event_ts] DEFAULT SYSDATETIME(),    -- 事件时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_legal_hold_event_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_legal_hold_event_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_legal_hold_event_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_legal_hold_event] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_hold_assignment] ON [r_legal_hold_event] ([assignment_id]);


-- ========== 标签（Tag）==========
-- 标签表
CREATE TABLE [r_tag] (
    [id] NVARCHAR(64) NOT NULL,    -- 标签ID
    [tag_key] NVARCHAR(128) NOT NULL,    -- 标签键
    [tag_value] NVARCHAR(255) NULL,    -- 标签值
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_tag_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_tag_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_tag_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_tag] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_tag_kv] UNIQUE ([tag_key], [tag_value])
);


-- ========== 对象标签（ObjectTag）==========
-- 对象标签表
CREATE TABLE [r_object_tag] (
    [id] NVARCHAR(64) NOT NULL,    -- 对象标签ID
    [object_type] NVARCHAR(32) NOT NULL,    -- 对象类型：TABLE/FILE_SET/UNSTRUCTURED_SOURCE/SYSTEM
    [object_id] NVARCHAR(64) NOT NULL,    -- 对象ID
    [tag_id] NVARCHAR(64) NOT NULL,    -- 标签ID（r_tag.id）
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_object_tag_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_object_tag_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_object_tag_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_object_tag] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_object_tag] UNIQUE ([object_type], [object_id], [tag_id])
);
CREATE INDEX [idx_r_object_tag_tag] ON [r_object_tag] ([tag_id]);
