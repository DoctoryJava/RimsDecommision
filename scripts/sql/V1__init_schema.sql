-- ================================================================
-- RIMS Decommission 数据库初始化脚本
-- Flyway Migration V1__init_schema.sql
-- ================================================================

-- ========== 权限管理模块 ==========

-- 用户表
CREATE TABLE `sys_user` (
    `id` BIGINT NOT NULL COMMENT '主键ID (雪花算法)',
    `username` VARCHAR(64) NOT NULL COMMENT '用户名',
    `password` VARCHAR(256) NOT NULL COMMENT '密码(BCrypt加密)',
    `real_name` VARCHAR(64) DEFAULT NULL COMMENT '真实姓名',
    `email` VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
    `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    `avatar` VARCHAR(512) DEFAULT NULL COMMENT '头像URL',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除 1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 角色表
CREATE TABLE `sys_role` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `role_name` VARCHAR(64) NOT NULL COMMENT '角色名称',
    `role_code` VARCHAR(64) NOT NULL COMMENT '角色编码 (SUPER_ADMIN/SYSTEM_ADMIN/DATA_OPERATOR/AUDITOR/VIEWER)',
    `description` VARCHAR(256) DEFAULT NULL COMMENT '描述',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 菜单/页面表
CREATE TABLE `sys_menu` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父菜单ID (0=顶级)',
    `menu_name` VARCHAR(64) NOT NULL COMMENT '菜单名称',
    `menu_type` TINYINT NOT NULL COMMENT '类型: 1-目录 2-菜单 3-按钮',
    `path` VARCHAR(256) DEFAULT NULL COMMENT '路由路径',
    `component` VARCHAR(256) DEFAULT NULL COMMENT '前端组件路径',
    `icon` VARCHAR(64) DEFAULT NULL COMMENT '图标',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
    `visible` TINYINT NOT NULL DEFAULT 1 COMMENT '是否可见: 0-隐藏 1-显示',
    `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    `permission_code` VARCHAR(128) DEFAULT NULL COMMENT '权限标识 (e.g. system:user:create)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表';

-- 权限表
CREATE TABLE `sys_permission` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `permission_name` VARCHAR(64) NOT NULL COMMENT '权限名称',
    `permission_code` VARCHAR(128) NOT NULL COMMENT '权限编码',
    `resource_type` VARCHAR(32) DEFAULT NULL COMMENT '资源类型: menu/button/api',
    `description` VARCHAR(256) DEFAULT NULL COMMENT '描述',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_permission_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 用户-角色关联表
CREATE TABLE `sys_user_role` (
    `id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 角色-菜单关联表
CREATE TABLE `sys_role_menu` (
    `id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    `menu_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色菜单关联表';

-- 角色-权限关联表
CREATE TABLE `sys_role_permission` (
    `id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    `permission_id` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';


-- ========== 退役系统管理模块 ==========

-- 退役系统注册表
CREATE TABLE `decomm_system` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `system_name` VARCHAR(128) NOT NULL COMMENT '系统名称 (e.g. 旧CRM系统)',
    `system_code` VARCHAR(64) NOT NULL COMMENT '系统编码 (e.g. CRM_V1, 用于UC schema命名)',
    `description` TEXT DEFAULT NULL COMMENT '系统描述',
    `department` VARCHAR(128) DEFAULT NULL COMMENT '所属部门',
    `owner` VARCHAR(64) DEFAULT NULL COMMENT '负责人',
    `owner_email` VARCHAR(128) DEFAULT NULL COMMENT '负责人邮箱',
    `status` VARCHAR(32) NOT NULL DEFAULT 'REGISTERED'
        COMMENT '状态: REGISTERED/CONFIGURED/SYNCING/ARCHIVED/EXPIRING/DESTROYED',
    `retention_years` INT NOT NULL DEFAULT 7 COMMENT '数据保留年限',
    `decommission_date` DATE DEFAULT NULL COMMENT '计划退役日期',
    `actual_decommission_date` DATE DEFAULT NULL COMMENT '实际退役日期',
    `sync_completed_date` DATE DEFAULT NULL COMMENT '同步完成日期 (保留期起算点)',
    `destroy_after_date` DATE DEFAULT NULL COMMENT '到期销毁日期 = sync_completed + retention_years',
    `actual_destroy_date` DATE DEFAULT NULL COMMENT '实际销毁日期',
    `uc_catalog_name` VARCHAR(64) DEFAULT 'lake' COMMENT 'Unity Catalog catalog 名',
    `uc_schema_name` VARCHAR(128) DEFAULT NULL COMMENT 'Unity Catalog schema: lake.{system_code}',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_system_code` (`system_code`),
    KEY `idx_status` (`status`),
    KEY `idx_department` (`department`),
    KEY `idx_destroy_after` (`destroy_after_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退役系统注册表';

-- 角色-系统映射表 (不同角色管理不同的退役系统)
CREATE TABLE `sys_role_system` (
    `id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_system` (`role_id`, `system_id`),
    KEY `idx_system_id` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色系统映射表';

-- 数据库配置表 (源系统 DB 连接信息, 敏感字段加密)
CREATE TABLE `decomm_db_config` (
    `id` BIGINT NOT NULL,
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `db_type` VARCHAR(32) NOT NULL COMMENT '数据库类型: MYSQL/POSTGRESQL/ORACLE/SQLSERVER/DB2',
    `host` VARCHAR(256) NOT NULL COMMENT '主机地址',
    `port` INT NOT NULL COMMENT '端口',
    `database_name` VARCHAR(128) NOT NULL COMMENT '数据库名',
    `schema_name` VARCHAR(128) DEFAULT NULL COMMENT 'Schema名称',
    `username` VARCHAR(128) NOT NULL COMMENT '用户名',
    `password_encrypted` VARCHAR(1024) NOT NULL COMMENT '密码 (AES加密 或 Key Vault 引用)',
    `connection_params` VARCHAR(512) DEFAULT NULL COMMENT '额外 JDBC 连接参数',
    `jdbc_url_override` VARCHAR(512) DEFAULT NULL COMMENT '自定义 JDBC URL (覆盖自动拼接)',
    `test_status` VARCHAR(16) DEFAULT 'UNTESTED' COMMENT 'UNTESTED/SUCCESS/FAILED',
    `last_test_time` DATETIME DEFAULT NULL,
    `test_message` VARCHAR(512) DEFAULT NULL COMMENT '测试结果信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='源数据库配置表';

-- 存储配置表 (目标归档存储, ADLS Gen2 / Azure Blob)
CREATE TABLE `decomm_storage_config` (
    `id` BIGINT NOT NULL,
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `storage_type` VARCHAR(32) NOT NULL DEFAULT 'ADLS_GEN2' COMMENT 'ADLS_GEN2/AZURE_BLOB',
    `storage_account` VARCHAR(128) NOT NULL COMMENT 'Azure 存储账户名',
    `connection_string_encrypted` VARCHAR(2048) NOT NULL COMMENT '连接字符串 (加密)',
    `container_name` VARCHAR(128) NOT NULL COMMENT '容器/文件系统名称',
    `path_prefix` VARCHAR(256) DEFAULT NULL COMMENT '路径前缀 (e.g. archive/CRM_V1)',
    `file_format` VARCHAR(16) NOT NULL DEFAULT 'ICEBERG' COMMENT 'ICEBERG/DELTA/PARQUET',
    `compression` VARCHAR(16) DEFAULT 'SNAPPY' COMMENT 'NONE/SNAPPY/GZIP/ZSTD',
    `blob_container_name` VARCHAR(128) DEFAULT NULL COMMENT '附件 Blob 容器名 (非结构化)',
    `test_status` VARCHAR(16) DEFAULT 'UNTESTED',
    `last_test_time` DATETIME DEFAULT NULL,
    `test_message` VARCHAR(512) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='目标存储配置表';

-- ⭐ Schema Registry 表 (核心! 驱动动态前端渲染)
CREATE TABLE `decomm_schema_registry` (
    `id` BIGINT NOT NULL,
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `table_name` VARCHAR(256) NOT NULL COMMENT '源表名 (e.g. CUSTOMER_ORDER)',
    `table_alias` VARCHAR(256) DEFAULT NULL COMMENT '中文别名 (e.g. 客户订单)',
    `primary_key` VARCHAR(128) DEFAULT NULL COMMENT '主键列名',
    `uc_full_name` VARCHAR(512) DEFAULT NULL COMMENT 'UC 全限定名: lake.CRM_V1.CUSTOMER_ORDER',
    `schema_json` JSON NOT NULL COMMENT '完整 Schema 描述符 (JSON, 详见 AGENT.md)',
    `is_attachment_table` TINYINT NOT NULL DEFAULT 0 COMMENT '是否为附件表',
    `attachment_config` JSON DEFAULT NULL COMMENT '附件表配置 (objectKeyField, blobContainer 等)',
    `row_count` BIGINT DEFAULT 0 COMMENT '实际行数 (同步完成后更新)',
    `data_size_bytes` BIGINT DEFAULT 0 COMMENT '实际数据大小 (bytes)',
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/SYNCED/DESTROYED',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '前端显示排序',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_system_table` (`system_id`, `table_name`),
    KEY `idx_system_id` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schema Registry 表 (动态前端驱动)';

-- 同步任务表
CREATE TABLE `decomm_sync_job` (
    `id` BIGINT NOT NULL,
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `job_name` VARCHAR(128) DEFAULT NULL COMMENT '任务名称',
    `job_type` VARCHAR(16) NOT NULL DEFAULT 'FULL' COMMENT 'FULL/INCREMENTAL/COMPACT/DESTROY',
    `databricks_job_id` VARCHAR(64) DEFAULT NULL COMMENT 'Databricks Job ID',
    `databricks_run_id` VARCHAR(64) DEFAULT NULL COMMENT 'Databricks Run ID',
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        COMMENT 'PENDING/SUBMITTED/RUNNING/SUCCESS/FAILED/CANCELLED',
    `progress_percent` INT DEFAULT 0 COMMENT '进度百分比 (0-100)',
    `start_time` DATETIME DEFAULT NULL,
    `end_time` DATETIME DEFAULT NULL,
    `tables_synced` INT DEFAULT 0 COMMENT '已完成表数',
    `total_tables` INT DEFAULT 0 COMMENT '总表数',
    `rows_synced` BIGINT DEFAULT 0 COMMENT '已同步行数',
    `data_size_bytes` BIGINT DEFAULT 0 COMMENT '同步数据大小 (bytes)',
    `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
    `output_json` JSON DEFAULT NULL COMMENT 'Databricks Notebook 输出 JSON',
    `retry_count` INT DEFAULT 0 COMMENT '已重试次数',
    `max_retries` INT DEFAULT 3 COMMENT '最大重试次数',
    `created_by` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步任务表';

-- 同步日志表
CREATE TABLE `decomm_sync_log` (
    `id` BIGINT NOT NULL,
    `job_id` BIGINT NOT NULL COMMENT '任务ID',
    `log_level` VARCHAR(8) NOT NULL DEFAULT 'INFO' COMMENT 'DEBUG/INFO/WARN/ERROR',
    `log_message` TEXT NOT NULL COMMENT '日志内容',
    `table_name` VARCHAR(256) DEFAULT NULL COMMENT '相关表名',
    `rows_processed` BIGINT DEFAULT NULL COMMENT '处理行数',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_job_id` (`job_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步日志表';

-- 生命周期策略表
CREATE TABLE `decomm_lifecycle_policy` (
    `id` BIGINT NOT NULL,
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `policy_type` VARCHAR(32) NOT NULL COMMENT 'NOTIFY/DESTROY',
    `trigger_days_before` INT NOT NULL DEFAULT 30 COMMENT '到期前N天触发通知',
    `auto_destroy` TINYINT NOT NULL DEFAULT 0 COMMENT '是否自动销毁 (0=需手动确认)',
    `notify_emails` VARCHAR(512) DEFAULT NULL COMMENT '通知邮箱列表 (逗号分隔)',
    `last_notified_at` DATETIME DEFAULT NULL COMMENT '最后通知时间',
    `destroy_status` VARCHAR(16) DEFAULT 'PENDING'
        COMMENT 'PENDING/APPROVED/EXECUTING/COMPLETED/FAILED',
    `destroy_approved_by` BIGINT DEFAULT NULL COMMENT '批准销毁的管理员ID',
    `destroy_approved_at` DATETIME DEFAULT NULL COMMENT '批准时间',
    `destroy_job_id` VARCHAR(64) DEFAULT NULL COMMENT 'Databricks 销毁 Job ID',
    `destroyed_at` DATETIME DEFAULT NULL COMMENT '实际销毁完成时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`),
    KEY `idx_destroy_status` (`destroy_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据生命周期策略表';

-- 审计日志表
CREATE TABLE `sys_audit_log` (
    `id` BIGINT NOT NULL,
    `user_id` BIGINT DEFAULT NULL COMMENT '操作用户ID',
    `username` VARCHAR(64) DEFAULT NULL COMMENT '操作用户名',
    `operation` VARCHAR(32) NOT NULL COMMENT '操作: CREATE/UPDATE/DELETE/LOGIN/LOGOUT/QUERY/SYNC/DESTROY/EXPORT/SAS_ISSUE',
    `module` VARCHAR(64) DEFAULT NULL COMMENT '模块: auth/system/decommission/sync/lifecycle',
    `target_type` VARCHAR(64) DEFAULT NULL COMMENT '目标类型: User/Role/System/Schema/SyncJob',
    `target_id` VARCHAR(64) DEFAULT NULL COMMENT '目标ID',
    `target_name` VARCHAR(256) DEFAULT NULL COMMENT '目标名称',
    `description` VARCHAR(512) DEFAULT NULL COMMENT '操作描述',
    `request_method` VARCHAR(8) DEFAULT NULL COMMENT 'HTTP 方法',
    `request_url` VARCHAR(512) DEFAULT NULL COMMENT '请求URL',
    `request_body` TEXT DEFAULT NULL COMMENT '请求体 (脱敏后)',
    `ip_address` VARCHAR(64) DEFAULT NULL COMMENT '客户端IP',
    `user_agent` VARCHAR(512) DEFAULT NULL COMMENT '浏览器UA',
    `status` TINYINT DEFAULT 1 COMMENT '操作结果: 0-失败 1-成功',
    `error_message` TEXT DEFAULT NULL,
    `duration_ms` INT DEFAULT NULL COMMENT '耗时(毫秒)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_operation` (`operation`),
    KEY `idx_module` (`module`),
    KEY `idx_target` (`target_type`, `target_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';
