-- ================================================================
-- RIMS Decommission 数据库初始化脚本
-- Flyway Migration V1__init_schema.sql
-- ================================================================

-- ========== 权限管理模块 ==========

-- 用户表
CREATE TABLE `sys_user` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
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
    `role_code` VARCHAR(64) NOT NULL COMMENT '角色编码',
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
    `permission_code` VARCHAR(128) DEFAULT NULL COMMENT '权限标识',
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
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
    KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 角色-菜单关联表
CREATE TABLE `sys_role_menu` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `menu_id` BIGINT NOT NULL COMMENT '菜单ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_menu` (`role_id`, `menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色菜单关联表';

-- 角色-权限关联表
CREATE TABLE `sys_role_permission` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `permission_id` BIGINT NOT NULL COMMENT '权限ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- ========== 退役系统管理模块 ==========

-- 退役系统注册表
CREATE TABLE `decomm_system` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `system_name` VARCHAR(128) NOT NULL COMMENT '系统名称',
    `system_code` VARCHAR(64) NOT NULL COMMENT '系统编码',
    `description` TEXT DEFAULT NULL COMMENT '系统描述',
    `department` VARCHAR(128) DEFAULT NULL COMMENT '所属部门',
    `owner` VARCHAR(64) DEFAULT NULL COMMENT '负责人',
    `owner_email` VARCHAR(128) DEFAULT NULL COMMENT '负责人邮箱',
    `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态: ACTIVE/DECOMMISSIONING/ARCHIVED/DESTROYED',
    `decommission_date` DATE DEFAULT NULL COMMENT '计划退役日期',
    `actual_decommission_date` DATE DEFAULT NULL COMMENT '实际退役日期',
    `data_retention_years` INT DEFAULT 7 COMMENT '数据保留年限',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted` TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_system_code` (`system_code`),
    KEY `idx_status` (`status`),
    KEY `idx_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退役系统注册表';

-- 角色-系统映射表
CREATE TABLE `sys_role_system` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `role_id` BIGINT NOT NULL COMMENT '角色ID',
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_role_system` (`role_id`, `system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色系统映射表';

-- 数据库配置表（源系统 DB 信息）
CREATE TABLE `decomm_db_config` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `db_type` VARCHAR(32) NOT NULL COMMENT '数据库类型: MYSQL/POSTGRESQL/ORACLE/SQLSERVER',
    `host` VARCHAR(256) NOT NULL COMMENT '主机地址',
    `port` INT NOT NULL COMMENT '端口',
    `database_name` VARCHAR(128) NOT NULL COMMENT '数据库名',
    `schema_name` VARCHAR(128) DEFAULT NULL COMMENT 'Schema名称',
    `username` VARCHAR(128) NOT NULL COMMENT '用户名',
    `password_encrypted` VARCHAR(512) NOT NULL COMMENT '密码(AES加密)',
    `connection_params` VARCHAR(512) DEFAULT NULL COMMENT '额外连接参数',
    `test_status` VARCHAR(16) DEFAULT 'UNTESTED' COMMENT '连接测试状态: UNTESTED/SUCCESS/FAILED',
    `last_test_time` DATETIME DEFAULT NULL COMMENT '最后测试时间',
    `test_message` VARCHAR(512) DEFAULT NULL COMMENT '测试结果信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库配置表';

-- 存储配置表（目标归档存储）
CREATE TABLE `decomm_storage_config` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `storage_type` VARCHAR(32) NOT NULL DEFAULT 'AZURE_BLOB' COMMENT '存储类型: AZURE_BLOB',
    `connection_string_encrypted` VARCHAR(1024) NOT NULL COMMENT '连接字符串(AES加密)',
    `container_name` VARCHAR(128) NOT NULL COMMENT '容器名称',
    `path_prefix` VARCHAR(256) DEFAULT NULL COMMENT '路径前缀',
    `file_format` VARCHAR(16) NOT NULL DEFAULT 'PARQUET' COMMENT '文件格式: PARQUET/DELTA/CSV',
    `compression` VARCHAR(16) DEFAULT 'SNAPPY' COMMENT '压缩方式: NONE/SNAPPY/GZIP/ZSTD',
    `test_status` VARCHAR(16) DEFAULT 'UNTESTED' COMMENT '连接测试状态',
    `last_test_time` DATETIME DEFAULT NULL COMMENT '最后测试时间',
    `test_message` VARCHAR(512) DEFAULT NULL COMMENT '测试结果信息',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='存储配置表';

-- Schema 映射表
CREATE TABLE `decomm_schema_mapping` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `source_table` VARCHAR(256) NOT NULL COMMENT '源表名',
    `source_columns` JSON DEFAULT NULL COMMENT '源表列信息(JSON)',
    `target_path` VARCHAR(512) NOT NULL COMMENT '目标存储路径',
    `target_format` VARCHAR(16) DEFAULT 'PARQUET' COMMENT '目标格式',
    `transform_rules` JSON DEFAULT NULL COMMENT '转换规则(JSON)',
    `partition_columns` VARCHAR(512) DEFAULT NULL COMMENT '分区列(逗号分隔)',
    `row_count_estimate` BIGINT DEFAULT NULL COMMENT '预估行数',
    `data_size_estimate` BIGINT DEFAULT NULL COMMENT '预估数据大小(字节)',
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING/MAPPED/SYNCED',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`),
    KEY `idx_source_table` (`source_table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schema映射表';

-- 同步任务表
CREATE TABLE `decomm_sync_job` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `job_name` VARCHAR(128) DEFAULT NULL COMMENT '任务名称',
    `job_type` VARCHAR(16) NOT NULL DEFAULT 'FULL' COMMENT '任务类型: FULL/INCREMENTAL',
    `databricks_job_id` VARCHAR(64) DEFAULT NULL COMMENT 'Databricks Job ID',
    `databricks_run_id` VARCHAR(64) DEFAULT NULL COMMENT 'Databricks Run ID',
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING/SUBMITTED/RUNNING/SUCCESS/FAILED/CANCELLED',
    `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
    `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
    `tables_synced` INT DEFAULT 0 COMMENT '已同步表数',
    `total_tables` INT DEFAULT 0 COMMENT '总表数',
    `rows_synced` BIGINT DEFAULT 0 COMMENT '已同步行数',
    `data_size_bytes` BIGINT DEFAULT 0 COMMENT '同步数据大小(字节)',
    `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
    `retry_count` INT DEFAULT 0 COMMENT '重试次数',
    `max_retries` INT DEFAULT 3 COMMENT '最大重试次数',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_system_id` (`system_id`),
    KEY `idx_status` (`status`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步任务表';

-- 同步日志表
CREATE TABLE `decomm_sync_log` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `job_id` BIGINT NOT NULL COMMENT '任务ID',
    `log_level` VARCHAR(8) NOT NULL DEFAULT 'INFO' COMMENT '日志级别: DEBUG/INFO/WARN/ERROR',
    `log_message` TEXT NOT NULL COMMENT '日志内容',
    `table_name` VARCHAR(256) DEFAULT NULL COMMENT '相关表名',
    `rows_processed` BIGINT DEFAULT NULL COMMENT '处理行数',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_job_id` (`job_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步日志表';

-- 审计日志表
CREATE TABLE `sys_audit_log` (
    `id` BIGINT NOT NULL COMMENT '主键ID',
    `user_id` BIGINT DEFAULT NULL COMMENT '操作用户ID',
    `username` VARCHAR(64) DEFAULT NULL COMMENT '操作用户名',
    `operation` VARCHAR(32) NOT NULL COMMENT '操作类型: CREATE/UPDATE/DELETE/LOGIN/LOGOUT/EXPORT',
    `module` VARCHAR(64) DEFAULT NULL COMMENT '模块',
    `target_type` VARCHAR(64) DEFAULT NULL COMMENT '目标类型',
    `target_id` VARCHAR(64) DEFAULT NULL COMMENT '目标ID',
    `description` VARCHAR(512) DEFAULT NULL COMMENT '操作描述',
    `request_method` VARCHAR(8) DEFAULT NULL COMMENT '请求方法',
    `request_url` VARCHAR(512) DEFAULT NULL COMMENT '请求URL',
    `request_params` TEXT DEFAULT NULL COMMENT '请求参数',
    `ip_address` VARCHAR(64) DEFAULT NULL COMMENT 'IP地址',
    `user_agent` VARCHAR(512) DEFAULT NULL COMMENT '浏览器UA',
    `status` TINYINT DEFAULT 1 COMMENT '操作结果: 0-失败 1-成功',
    `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
    `duration_ms` INT DEFAULT NULL COMMENT '耗时(毫秒)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_operation` (`operation`),
    KEY `idx_module` (`module`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';
