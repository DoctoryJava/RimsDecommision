-- ================================================================
-- RIMS Decommission - 将 Mock 数据落地为真实数据库表
-- Flyway Migration V3__create_r_tables.sql（SQL Server 版）
-- 所有表均以 r_ 开头，用于替换后端 MockStore / MockUserDetailsService
-- 数据库：Microsoft SQL Server 2019+（T-SQL）
-- ================================================================

-- ========== 用户表 ==========
-- 用户表
CREATE TABLE [r_user] (
    [id] NVARCHAR(64) NOT NULL,    -- 用户ID（前端格式 u-001）
    [name] NVARCHAR(128) NOT NULL,    -- 姓名
    [email] NVARCHAR(128) NOT NULL,    -- 邮箱（登录名）
    [password] NVARCHAR(256) NOT NULL,    -- BCrypt 加密密码
    [avatar] NVARCHAR(16) NULL,    -- 头像（姓名首字母）
    [role_code] NVARCHAR(64) NOT NULL,    -- 角色编码（super_admin 等）
    [category] NVARCHAR(32) NOT NULL,    -- 归属：admin/tenant
    [system_ids] NVARCHAR(MAX) NULL,    -- 可访问系统ID列表
    [status] NVARCHAR(16) NOT NULL CONSTRAINT [df_r_user_status] DEFAULT 'active',    -- 状态：active/disabled
    [last_login] DATETIME2(3) NULL,    -- 最后登录时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_user_created_at] DEFAULT SYSDATETIME(),    -- 创建时间
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_user_updated_at] DEFAULT SYSDATETIME(),    -- 更新时间
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_user_deleted] DEFAULT 0,    -- 逻辑删除 0-否 1-是
    CONSTRAINT [pk_r_user] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_user_email] UNIQUE ([email])
);
CREATE INDEX [idx_r_user_role] ON [r_user] ([role_code]);
CREATE INDEX [idx_r_user_status] ON [r_user] ([status]);


-- ========== 角色表 ==========
-- 角色表
CREATE TABLE [r_role] (
    [id] NVARCHAR(64) NOT NULL,    -- 角色ID（r-001）
    [role_key] NVARCHAR(64) NOT NULL,    -- 角色编码（super_admin）
    [name] NVARCHAR(128) NOT NULL,    -- 角色名称
    [description] NVARCHAR(512) NULL,    -- 描述
    [user_count] INT NOT NULL CONSTRAINT [df_r_role_user_count] DEFAULT 0,    -- 关联用户数
    [permissions] NVARCHAR(MAX) NULL,    -- 权限编码列表
    [category] NVARCHAR(32) NOT NULL,    -- 归属：admin/tenant
    [color] NVARCHAR(32) NULL,    -- 前端主题色
    [is_builtin] TINYINT NOT NULL CONSTRAINT [df_r_role_is_builtin] DEFAULT 1,    -- 是否内置角色
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_role_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_role_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_role_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_role] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_role_key] UNIQUE ([role_key])
);


-- ========== 权限表 ==========
-- 权限表
CREATE TABLE [r_permission] (
    [id] NVARCHAR(64) NOT NULL,    -- 权限ID（p-001）
    [code] NVARCHAR(128) NOT NULL,    -- 权限编码（systems.view）
    [name] NVARCHAR(128) NOT NULL,    -- 权限名称
    [module] NVARCHAR(64) NOT NULL,    -- 所属模块
    [action] NVARCHAR(64) NOT NULL,    -- 动作（view/create/edit/...）
    [category] NVARCHAR(32) NOT NULL,    -- 归属：admin/tenant
    [description] NVARCHAR(512) NULL,    -- 描述
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_permission_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_permission_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_permission_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_permission] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_permission_code] UNIQUE ([code])
);


-- ========== 页面表 ==========
-- 页面表
CREATE TABLE [r_page] (
    [id] NVARCHAR(64) NOT NULL,    -- 页面ID（pg-001）
    [name] NVARCHAR(128) NOT NULL,    -- 页面名称
    [path] NVARCHAR(256) NOT NULL,    -- 路由路径
    [module] NVARCHAR(64) NOT NULL,    -- 所属模块
    [icon] NVARCHAR(64) NULL,    -- 图标名
    [visible_to] NVARCHAR(MAX) NULL,    -- 可见角色列表
    [sort_order] INT NOT NULL CONSTRAINT [df_r_page_sort_order] DEFAULT 0,    -- 排序
    [enabled] TINYINT NOT NULL CONSTRAINT [df_r_page_enabled] DEFAULT 1,    -- 是否启用
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_page_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_page_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_page_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_page] PRIMARY KEY ([id])
);


-- ========== 退役系统表 ==========
-- 退役系统表
CREATE TABLE [r_system] (
    [id] NVARCHAR(64) NOT NULL,    -- 系统ID（sys-001）
    [name] NVARCHAR(128) NOT NULL,    -- 系统名称
    [code] NVARCHAR(64) NOT NULL,    -- 系统编码
    [description] NVARCHAR(512) NULL,    -- 描述
    [owner] NVARCHAR(128) NULL,    -- 负责人
    [department] NVARCHAR(128) NULL,    -- 所属部门
    [stage] NVARCHAR(32) NOT NULL,    -- 阶段：active/deprecated/archived/destroyed
    [status] NVARCHAR(32) NOT NULL CONSTRAINT [df_r_system_status] DEFAULT 'REGISTERED',    -- 生命周期状态（6态）
    [created_at] DATE NULL,    -- 注册日期
    [archived_at] DATE NULL,    -- 归档日期
    [db_config] NVARCHAR(MAX) NULL,    -- 源库连接配置
    [storage_config] NVARCHAR(MAX) NULL,    -- 存储配置
    [last_sync] NVARCHAR(64) NULL,    -- 最近同步时间
    [sync_status] NVARCHAR(32) NULL,    -- 同步状态
    [schema_count] INT NOT NULL CONSTRAINT [df_r_system_schema_count] DEFAULT 0,
    [table_count] INT NOT NULL CONSTRAINT [df_r_system_table_count] DEFAULT 0,
    [data_size_gb] INT NOT NULL CONSTRAINT [df_r_system_data_size_gb] DEFAULT 0,    -- 数据量 GB
    [tags] NVARCHAR(MAX) NULL,    -- 标签列表
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_system_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_system_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_system] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_system_code] UNIQUE ([code])
);


-- ========== 同步任务表 ==========
-- 同步任务表
CREATE TABLE [r_sync_job] (
    [id] NVARCHAR(64) NOT NULL,    -- 任务ID（job-001）
    [system_id] NVARCHAR(64) NULL,    -- 系统ID
    [system_name] NVARCHAR(128) NULL,    -- 系统名称
    [type] NVARCHAR(32) NULL,    -- 类型：full/incremental/schema-only
    [status] NVARCHAR(32) NOT NULL CONSTRAINT [df_r_sync_job_status] DEFAULT 'syncing',    -- 状态：success/syncing/failed/partial
    [started_at] NVARCHAR(64) NULL,    -- 开始时间
    [duration] NVARCHAR(64) NULL,    -- 耗时
    [records] BIGINT NOT NULL CONSTRAINT [df_r_sync_job_records] DEFAULT 0,    -- 处理记录数
    [triggered_by] NVARCHAR(128) NULL,    -- 触发人
    [logs] NVARCHAR(MAX) NULL,    -- 日志列表
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_job_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_sync_job_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_sync_job_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_sync_job] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_sync_job_system] ON [r_sync_job] ([system_id]);


-- ========== Schema 注册表 ==========
-- Schema 注册表
CREATE TABLE [r_schema] (
    [id] NVARCHAR(64) NOT NULL,    -- Schema ID（sc-001）
    [system_id] NVARCHAR(64) NULL,    -- 系统ID
    [name] NVARCHAR(128) NOT NULL,    -- Schema 名称
    [tables] NVARCHAR(MAX) NULL,    -- 表列表
    [synced_at] NVARCHAR(64) NULL,    -- 同步时间
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_schema_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_schema_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_schema_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_schema] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_schema_system] ON [r_schema] ([system_id]);


-- ========== 物理表元数据表 ==========
-- 物理表元数据表
CREATE TABLE [r_physical_table] (
    [id] NVARCHAR(64) NOT NULL,    -- 表ID（t-001）
    [name] NVARCHAR(128) NOT NULL,    -- 物理表名
    [label] NVARCHAR(128) NULL,    -- 中文标签
    [system_id] NVARCHAR(64) NULL,    -- 系统ID
    [columns] NVARCHAR(MAX) NULL,    -- 列定义列表
    [rows] NVARCHAR(MAX) NULL,    -- 示例数据（用于配置化前端渲染）
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_physical_table_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_physical_table_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_physical_table_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_physical_table] PRIMARY KEY ([id]),
    CONSTRAINT [uk_r_physical_table_name] UNIQUE ([name])
);


-- ========== 查询配置表 ==========
-- 查询配置表
CREATE TABLE [r_query_config] (
    [id] NVARCHAR(64) NOT NULL,    -- 配置ID（qc-001）
    [name] NVARCHAR(128) NOT NULL,    -- 配置名称
    [description] NVARCHAR(512) NULL,    -- 描述
    [base_table] NVARCHAR(128) NOT NULL,    -- 基础表
    [joins] NVARCHAR(MAX) NULL,    -- 连接定义列表
    [fields] NVARCHAR(MAX) NULL,    -- 字段列表
    [default_sort] NVARCHAR(MAX) NULL,    -- 默认排序
    [page_size] INT NOT NULL CONSTRAINT [df_r_query_config_page_size] DEFAULT 10,    -- 默认分页大小
    [status] NVARCHAR(32) NOT NULL CONSTRAINT [df_r_query_config_status] DEFAULT 'active',    -- 状态：active/draft
    [created_by] NVARCHAR(128) NULL,    -- 创建人
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_query_config_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_query_config_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_query_config_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_query_config] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_query_config_base] ON [r_query_config] ([base_table]);
