-- ================================================================
-- RIMS Decommission 数据库初始化脚本
-- Flyway Migration V1__init_schema.sql（SQL Server 版）
-- ================================================================

-- ========== 权限管理模块 ==========

-- 用户表
CREATE TABLE [sys_user] (
    [id] BIGINT NOT NULL,    -- 主键ID (雪花算法)
    [username] NVARCHAR(64) NOT NULL,    -- 用户名
    [password] NVARCHAR(256) NOT NULL,    -- 密码(BCrypt加密)
    [real_name] NVARCHAR(64) NULL,    -- 真实姓名
    [email] NVARCHAR(128) NULL,    -- 邮箱
    [phone] NVARCHAR(20) NULL,    -- 手机号
    [avatar] NVARCHAR(512) NULL,    -- 头像URL
    [status] TINYINT NOT NULL CONSTRAINT [df_sys_user_status] DEFAULT 1,    -- 状态: 0-禁用 1-启用
    [last_login_time] DATETIME2(3) NULL,    -- 最后登录时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_user_created_at] DEFAULT SYSDATETIME(),    -- 创建时间
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_user_updated_at] DEFAULT SYSDATETIME(),    -- 更新时间
    [deleted] TINYINT NOT NULL CONSTRAINT [df_sys_user_deleted] DEFAULT 0,    -- 逻辑删除: 0-未删除 1-已删除
    CONSTRAINT [pk_sys_user] PRIMARY KEY ([id]),
    CONSTRAINT [uk_username] UNIQUE ([username])
);
CREATE INDEX [idx_status] ON [sys_user] ([status]);


-- 角色表
CREATE TABLE [sys_role] (
    [id] BIGINT NOT NULL,    -- 主键ID
    [role_name] NVARCHAR(64) NOT NULL,    -- 角色名称
    [role_code] NVARCHAR(64) NOT NULL,    -- 角色编码 (SUPER_ADMIN/SYSTEM_ADMIN/DATA_OPERATOR/AUDITOR/VIEWER)
    [description] NVARCHAR(256) NULL,    -- 描述
    [status] TINYINT NOT NULL CONSTRAINT [df_sys_role_status] DEFAULT 1,    -- 状态: 0-禁用 1-启用
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_role_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_role_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_sys_role_deleted] DEFAULT 0,
    CONSTRAINT [pk_sys_role] PRIMARY KEY ([id]),
    CONSTRAINT [uk_role_code] UNIQUE ([role_code])
);


-- 菜单/页面表
-- 菜单表
CREATE TABLE [sys_menu] (
    [id] BIGINT NOT NULL,    -- 主键ID
    [parent_id] BIGINT NOT NULL CONSTRAINT [df_sys_menu_parent_id] DEFAULT 0,    -- 父菜单ID (0=顶级)
    [menu_name] NVARCHAR(64) NOT NULL,    -- 菜单名称
    [menu_type] TINYINT NOT NULL,    -- 类型: 1-目录 2-菜单 3-按钮
    [path] NVARCHAR(256) NULL,    -- 路由路径
    [component] NVARCHAR(256) NULL,    -- 前端组件路径
    [icon] NVARCHAR(64) NULL,    -- 图标
    [sort_order] INT NOT NULL CONSTRAINT [df_sys_menu_sort_order] DEFAULT 0,    -- 排序
    [visible] TINYINT NOT NULL CONSTRAINT [df_sys_menu_visible] DEFAULT 1,    -- 是否可见: 0-隐藏 1-显示
    [status] TINYINT NOT NULL CONSTRAINT [df_sys_menu_status] DEFAULT 1,    -- 状态: 0-禁用 1-启用
    [permission_code] NVARCHAR(128) NULL,    -- 权限标识 (e.g. system:user:create)
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_menu_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_menu_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_sys_menu_deleted] DEFAULT 0,
    CONSTRAINT [pk_sys_menu] PRIMARY KEY ([id])
);
CREATE INDEX [idx_parent_id] ON [sys_menu] ([parent_id]);


-- 权限表
CREATE TABLE [sys_permission] (
    [id] BIGINT NOT NULL,    -- 主键ID
    [permission_name] NVARCHAR(64) NOT NULL,    -- 权限名称
    [permission_code] NVARCHAR(128) NOT NULL,    -- 权限编码
    [resource_type] NVARCHAR(32) NULL,    -- 资源类型: menu/button/api
    [description] NVARCHAR(256) NULL,    -- 描述
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_permission_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_permission_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_sys_permission_deleted] DEFAULT 0,
    CONSTRAINT [pk_sys_permission] PRIMARY KEY ([id]),
    CONSTRAINT [uk_permission_code] UNIQUE ([permission_code])
);


-- 用户-角色关联表
-- 用户角色关联表
CREATE TABLE [sys_user_role] (
    [id] BIGINT NOT NULL,
    [user_id] BIGINT NOT NULL,
    [role_id] BIGINT NOT NULL,
    CONSTRAINT [pk_sys_user_role] PRIMARY KEY ([id]),
    CONSTRAINT [uk_user_role] UNIQUE ([user_id], [role_id])
);
CREATE INDEX [idx_role_id] ON [sys_user_role] ([role_id]);


-- 角色-菜单关联表
-- 角色菜单关联表
CREATE TABLE [sys_role_menu] (
    [id] BIGINT NOT NULL,
    [role_id] BIGINT NOT NULL,
    [menu_id] BIGINT NOT NULL,
    CONSTRAINT [pk_sys_role_menu] PRIMARY KEY ([id]),
    CONSTRAINT [uk_role_menu] UNIQUE ([role_id], [menu_id])
);


-- 角色-权限关联表
-- 角色权限关联表
CREATE TABLE [sys_role_permission] (
    [id] BIGINT NOT NULL,
    [role_id] BIGINT NOT NULL,
    [permission_id] BIGINT NOT NULL,
    CONSTRAINT [pk_sys_role_permission] PRIMARY KEY ([id]),
    CONSTRAINT [uk_role_permission] UNIQUE ([role_id], [permission_id])
);


-- ========== 退役系统管理模块 ==========

-- 退役系统注册表
CREATE TABLE [decomm_system] (
    [id] BIGINT NOT NULL,    -- 主键ID
    [system_name] NVARCHAR(128) NOT NULL,    -- 系统名称 (e.g. 旧CRM系统)
    [system_code] NVARCHAR(64) NOT NULL,    -- 系统编码 (e.g. CRM_V1, 用于UC schema命名)
    [description] NVARCHAR(MAX) NULL,    -- 系统描述
    [department] NVARCHAR(128) NULL,    -- 所属部门
    [owner] NVARCHAR(64) NULL,    -- 负责人
    [owner_email] NVARCHAR(128) NULL,    -- 负责人邮箱
    [status] NVARCHAR(32) NOT NULL CONSTRAINT [df_decomm_system_status] DEFAULT 'REGISTERED',    -- 状态: REGISTERED/CONFIGURED/SYNCING/ARCHIVED/EXPIRING/DESTROYED
    [retention_years] INT NOT NULL CONSTRAINT [df_decomm_system_retention_years] DEFAULT 7,    -- 数据保留年限
    [decommission_date] DATE NULL,    -- 计划退役日期
    [actual_decommission_date] DATE NULL,    -- 实际退役日期
    [sync_completed_date] DATE NULL,    -- 同步完成日期 (保留期起算点)
    [destroy_after_date] DATE NULL,    -- 到期销毁日期 = sync_completed + retention_years
    [actual_destroy_date] DATE NULL,    -- 实际销毁日期
    [uc_catalog_name] NVARCHAR(64) NULL CONSTRAINT [df_decomm_system_uc_catalog_name] DEFAULT 'lake',    -- Unity Catalog catalog 名
    [uc_schema_name] NVARCHAR(128) NULL,    -- Unity Catalog schema: lake.{system_code}
    [created_by] BIGINT NULL,    -- 创建人ID
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_system_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_system_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_decomm_system_deleted] DEFAULT 0,
    CONSTRAINT [pk_decomm_system] PRIMARY KEY ([id]),
    CONSTRAINT [uk_system_code] UNIQUE ([system_code])
);
CREATE INDEX [idx_status] ON [decomm_system] ([status]);
CREATE INDEX [idx_department] ON [decomm_system] ([department]);
CREATE INDEX [idx_destroy_after] ON [decomm_system] ([destroy_after_date]);


-- 角色-系统映射表 (不同角色管理不同的退役系统)
-- 角色系统映射表
CREATE TABLE [sys_role_system] (
    [id] BIGINT NOT NULL,
    [role_id] BIGINT NOT NULL,    -- 角色ID
    [system_id] BIGINT NOT NULL,    -- 退役系统ID
    CONSTRAINT [pk_sys_role_system] PRIMARY KEY ([id]),
    CONSTRAINT [uk_role_system] UNIQUE ([role_id], [system_id])
);
CREATE INDEX [idx_system_id] ON [sys_role_system] ([system_id]);


-- 数据库配置表 (源系统 DB 连接信息, 敏感字段加密)
-- 源数据库配置表
CREATE TABLE [decomm_db_config] (
    [id] BIGINT NOT NULL,
    [system_id] BIGINT NOT NULL,    -- 退役系统ID
    [db_type] NVARCHAR(32) NOT NULL,    -- 数据库类型: MYSQL/POSTGRESQL/ORACLE/SQLSERVER/DB2
    [host] NVARCHAR(256) NOT NULL,    -- 主机地址
    [port] INT NOT NULL,    -- 端口
    [database_name] NVARCHAR(128) NOT NULL,    -- 数据库名
    [schema_name] NVARCHAR(128) NULL,    -- Schema名称
    [username] NVARCHAR(128) NOT NULL,    -- 用户名
    [password_encrypted] NVARCHAR(1024) NOT NULL,    -- 密码 (AES加密 或 Key Vault 引用)
    [connection_params] NVARCHAR(512) NULL,    -- 额外 JDBC 连接参数
    [jdbc_url_override] NVARCHAR(512) NULL,    -- 自定义 JDBC URL (覆盖自动拼接)
    [test_status] NVARCHAR(16) NULL CONSTRAINT [df_decomm_db_config_test_status] DEFAULT 'UNTESTED',    -- UNTESTED/SUCCESS/FAILED
    [last_test_time] DATETIME2(3) NULL,
    [test_message] NVARCHAR(512) NULL,    -- 测试结果信息
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_db_config_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_db_config_updated_at] DEFAULT SYSDATETIME(),
    CONSTRAINT [pk_decomm_db_config] PRIMARY KEY ([id])
);
CREATE INDEX [idx_system_id] ON [decomm_db_config] ([system_id]);


-- 存储配置表 (目标归档存储, ADLS Gen2 / Azure Blob)
-- 目标存储配置表
CREATE TABLE [decomm_storage_config] (
    [id] BIGINT NOT NULL,
    [system_id] BIGINT NOT NULL,    -- 退役系统ID
    [storage_type] NVARCHAR(32) NOT NULL CONSTRAINT [df_decomm_storage_config_storage_type] DEFAULT 'ADLS_GEN2',    -- ADLS_GEN2/AZURE_BLOB
    [storage_account] NVARCHAR(128) NOT NULL,    -- Azure 存储账户名
    [connection_string_encrypted] NVARCHAR(2048) NOT NULL,    -- 连接字符串 (加密)
    [container_name] NVARCHAR(128) NOT NULL,    -- 容器/文件系统名称
    [path_prefix] NVARCHAR(256) NULL,    -- 路径前缀 (e.g. archive/CRM_V1)
    [file_format] NVARCHAR(16) NOT NULL CONSTRAINT [df_decomm_storage_config_file_format] DEFAULT 'ICEBERG',    -- ICEBERG/DELTA/PARQUET
    [compression] NVARCHAR(16) NULL CONSTRAINT [df_decomm_storage_config_compression] DEFAULT 'SNAPPY',    -- NONE/SNAPPY/GZIP/ZSTD
    [blob_container_name] NVARCHAR(128) NULL,    -- 附件 Blob 容器名 (非结构化)
    [test_status] NVARCHAR(16) NULL CONSTRAINT [df_decomm_storage_config_test_status] DEFAULT 'UNTESTED',
    [last_test_time] DATETIME2(3) NULL,
    [test_message] NVARCHAR(512) NULL,
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_storage_config_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_storage_config_updated_at] DEFAULT SYSDATETIME(),
    CONSTRAINT [pk_decomm_storage_config] PRIMARY KEY ([id])
);
CREATE INDEX [idx_system_id] ON [decomm_storage_config] ([system_id]);


-- ⭐ Schema Registry 表 (核心! 驱动动态前端渲染)
-- Schema Registry 表 (动态前端驱动)
CREATE TABLE [decomm_schema_registry] (
    [id] BIGINT NOT NULL,
    [system_id] BIGINT NOT NULL,    -- 退役系统ID
    [table_name] NVARCHAR(256) NOT NULL,    -- 源表名 (e.g. CUSTOMER_ORDER)
    [table_alias] NVARCHAR(256) NULL,    -- 中文别名 (e.g. 客户订单)
    [primary_key] NVARCHAR(128) NULL,    -- 主键列名
    [uc_full_name] NVARCHAR(512) NULL,    -- UC 全限定名: lake.CRM_V1.CUSTOMER_ORDER
    [schema_json] NVARCHAR(MAX) NOT NULL,    -- 完整 Schema 描述符 (JSON, 详见 AGENT.md)
    [is_attachment_table] TINYINT NOT NULL CONSTRAINT [df_decomm_schema_registry_is_attachment_table] DEFAULT 0,    -- 是否为附件表
    [attachment_config] NVARCHAR(MAX) NULL,    -- 附件表配置 (objectKeyField, blobContainer 等)
    [row_count] BIGINT NULL CONSTRAINT [df_decomm_schema_registry_row_count] DEFAULT 0,    -- 实际行数 (同步完成后更新)
    [data_size_bytes] BIGINT NULL CONSTRAINT [df_decomm_schema_registry_data_size_bytes] DEFAULT 0,    -- 实际数据大小 (bytes)
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [df_decomm_schema_registry_status] DEFAULT 'PENDING',    -- PENDING/SYNCED/DESTROYED
    [sort_order] INT NOT NULL CONSTRAINT [df_decomm_schema_registry_sort_order] DEFAULT 0,    -- 前端显示排序
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_schema_registry_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_schema_registry_updated_at] DEFAULT SYSDATETIME(),
    CONSTRAINT [pk_decomm_schema_registry] PRIMARY KEY ([id]),
    CONSTRAINT [uk_system_table] UNIQUE ([system_id], [table_name])
);
CREATE INDEX [idx_system_id] ON [decomm_schema_registry] ([system_id]);


-- 同步任务表
CREATE TABLE [decomm_sync_job] (
    [id] BIGINT NOT NULL,
    [system_id] BIGINT NOT NULL,    -- 退役系统ID
    [job_name] NVARCHAR(128) NULL,    -- 任务名称
    [job_type] NVARCHAR(16) NOT NULL CONSTRAINT [df_decomm_sync_job_job_type] DEFAULT 'FULL',    -- FULL/INCREMENTAL/COMPACT/DESTROY
    [databricks_job_id] NVARCHAR(64) NULL,    -- Databricks Job ID
    [databricks_run_id] NVARCHAR(64) NULL,    -- Databricks Run ID
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [df_decomm_sync_job_status] DEFAULT 'PENDING',    -- PENDING/SUBMITTED/RUNNING/SUCCESS/FAILED/CANCELLED
    [progress_percent] INT NULL CONSTRAINT [df_decomm_sync_job_progress_percent] DEFAULT 0,    -- 进度百分比 (0-100)
    [start_time] DATETIME2(3) NULL,
    [end_time] DATETIME2(3) NULL,
    [tables_synced] INT NULL CONSTRAINT [df_decomm_sync_job_tables_synced] DEFAULT 0,    -- 已完成表数
    [total_tables] INT NULL CONSTRAINT [df_decomm_sync_job_total_tables] DEFAULT 0,    -- 总表数
    [rows_synced] BIGINT NULL CONSTRAINT [df_decomm_sync_job_rows_synced] DEFAULT 0,    -- 已同步行数
    [data_size_bytes] BIGINT NULL CONSTRAINT [df_decomm_sync_job_data_size_bytes] DEFAULT 0,    -- 同步数据大小 (bytes)
    [error_message] NVARCHAR(MAX) NULL,    -- 错误信息
    [output_json] NVARCHAR(MAX) NULL,    -- Databricks Notebook 输出 JSON
    [retry_count] INT NULL CONSTRAINT [df_decomm_sync_job_retry_count] DEFAULT 0,    -- 已重试次数
    [max_retries] INT NULL CONSTRAINT [df_decomm_sync_job_max_retries] DEFAULT 3,    -- 最大重试次数
    [created_by] BIGINT NULL,
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_sync_job_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_sync_job_updated_at] DEFAULT SYSDATETIME(),
    CONSTRAINT [pk_decomm_sync_job] PRIMARY KEY ([id])
);
CREATE INDEX [idx_system_id] ON [decomm_sync_job] ([system_id]);
CREATE INDEX [idx_status] ON [decomm_sync_job] ([status]);
CREATE INDEX [idx_created_at] ON [decomm_sync_job] ([created_at]);


-- 同步日志表
CREATE TABLE [decomm_sync_log] (
    [id] BIGINT NOT NULL,
    [job_id] BIGINT NOT NULL,    -- 任务ID
    [log_level] NVARCHAR(8) NOT NULL CONSTRAINT [df_decomm_sync_log_log_level] DEFAULT 'INFO',    -- DEBUG/INFO/WARN/ERROR
    [log_message] NVARCHAR(MAX) NOT NULL,    -- 日志内容
    [table_name] NVARCHAR(256) NULL,    -- 相关表名
    [rows_processed] BIGINT NULL,    -- 处理行数
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_sync_log_created_at] DEFAULT SYSDATETIME(),
    CONSTRAINT [pk_decomm_sync_log] PRIMARY KEY ([id])
);
CREATE INDEX [idx_job_id] ON [decomm_sync_log] ([job_id]);
CREATE INDEX [idx_created_at] ON [decomm_sync_log] ([created_at]);


-- 生命周期策略表
-- 数据生命周期策略表
CREATE TABLE [decomm_lifecycle_policy] (
    [id] BIGINT NOT NULL,
    [system_id] BIGINT NOT NULL,    -- 退役系统ID
    [policy_type] NVARCHAR(32) NOT NULL,    -- NOTIFY/DESTROY
    [trigger_days_before] INT NOT NULL CONSTRAINT [df_decomm_lifecycle_policy_trigger_days_before] DEFAULT 30,    -- 到期前N天触发通知
    [auto_destroy] TINYINT NOT NULL CONSTRAINT [df_decomm_lifecycle_policy_auto_destroy] DEFAULT 0,    -- 是否自动销毁 (0=需手动确认)
    [notify_emails] NVARCHAR(512) NULL,    -- 通知邮箱列表 (逗号分隔)
    [last_notified_at] DATETIME2(3) NULL,    -- 最后通知时间
    [destroy_status] NVARCHAR(16) NULL CONSTRAINT [df_decomm_lifecycle_policy_destroy_status] DEFAULT 'PENDING',    -- PENDING/APPROVED/EXECUTING/COMPLETED/FAILED
    [destroy_approved_by] BIGINT NULL,    -- 批准销毁的管理员ID
    [destroy_approved_at] DATETIME2(3) NULL,    -- 批准时间
    [destroy_job_id] NVARCHAR(64) NULL,    -- Databricks 销毁 Job ID
    [destroyed_at] DATETIME2(3) NULL,    -- 实际销毁完成时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_lifecycle_policy_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_decomm_lifecycle_policy_updated_at] DEFAULT SYSDATETIME(),
    CONSTRAINT [pk_decomm_lifecycle_policy] PRIMARY KEY ([id])
);
CREATE INDEX [idx_system_id] ON [decomm_lifecycle_policy] ([system_id]);
CREATE INDEX [idx_destroy_status] ON [decomm_lifecycle_policy] ([destroy_status]);


-- 审计日志表
CREATE TABLE [sys_audit_log] (
    [id] BIGINT NOT NULL,
    [user_id] BIGINT NULL,    -- 操作用户ID
    [username] NVARCHAR(64) NULL,    -- 操作用户名
    [operation] NVARCHAR(32) NOT NULL,    -- 操作: CREATE/UPDATE/DELETE/LOGIN/LOGOUT/QUERY/SYNC/DESTROY/EXPORT/SAS_ISSUE
    [module] NVARCHAR(64) NULL,    -- 模块: auth/system/decommission/sync/lifecycle
    [target_type] NVARCHAR(64) NULL,    -- 目标类型: User/Role/System/Schema/SyncJob
    [target_id] NVARCHAR(64) NULL,    -- 目标ID
    [target_name] NVARCHAR(256) NULL,    -- 目标名称
    [description] NVARCHAR(512) NULL,    -- 操作描述
    [request_method] NVARCHAR(8) NULL,    -- HTTP 方法
    [request_url] NVARCHAR(512) NULL,    -- 请求URL
    [request_body] NVARCHAR(MAX) NULL,    -- 请求体 (脱敏后)
    [ip_address] NVARCHAR(64) NULL,    -- 客户端IP
    [user_agent] NVARCHAR(512) NULL,    -- 浏览器UA
    [status] TINYINT NULL CONSTRAINT [df_sys_audit_log_status] DEFAULT 1,    -- 操作结果: 0-失败 1-成功
    [error_message] NVARCHAR(MAX) NULL,
    [duration_ms] INT NULL,    -- 耗时(毫秒)
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_sys_audit_log_created_at] DEFAULT SYSDATETIME(),
    CONSTRAINT [pk_sys_audit_log] PRIMARY KEY ([id])
);
CREATE INDEX [idx_user_id] ON [sys_audit_log] ([user_id]);
CREATE INDEX [idx_operation] ON [sys_audit_log] ([operation]);
CREATE INDEX [idx_module] ON [sys_audit_log] ([module]);
CREATE INDEX [idx_target] ON [sys_audit_log] ([target_type], [target_id]);
CREATE INDEX [idx_created_at] ON [sys_audit_log] ([created_at]);
