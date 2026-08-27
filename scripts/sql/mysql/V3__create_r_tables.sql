-- ================================================================
-- RIMS Decommission - 将 Mock 数据落地为真实数据库表
-- Flyway Migration V3__create_r_tables.sql
-- 所有表均以 r_ 开头，用于替换后端 MockStore / MockUserDetailsService
-- 数据库：MySQL 8.0（AiCoder）
-- ================================================================

-- ========== 用户表 ==========
CREATE TABLE `r_user` (
    `id`         VARCHAR(64)  NOT NULL COMMENT '用户ID（前端格式 u-001）',
    `name`       VARCHAR(128) NOT NULL COMMENT '姓名',
    `email`      VARCHAR(128) NOT NULL COMMENT '邮箱（登录名）',
    `password`   VARCHAR(256) NOT NULL COMMENT 'BCrypt 加密密码',
    `avatar`     VARCHAR(16)  DEFAULT NULL COMMENT '头像（姓名首字母）',
    `role_code`  VARCHAR(64)  NOT NULL COMMENT '角色编码（super_admin 等）',
    `category`   VARCHAR(32)  NOT NULL COMMENT '归属：admin/tenant',
    `system_ids` JSON         DEFAULT NULL COMMENT '可访问系统ID列表',
    `status`     VARCHAR(16)  NOT NULL DEFAULT 'active' COMMENT '状态：active/disabled',
    `last_login` DATETIME     DEFAULT NULL COMMENT '最后登录时间',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted`    TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除 0-否 1-是',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_user_email` (`email`),
    KEY `idx_r_user_role` (`role_code`),
    KEY `idx_r_user_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ========== 角色表 ==========
CREATE TABLE `r_role` (
    `id`          VARCHAR(64)  NOT NULL COMMENT '角色ID（r-001）',
    `role_key`    VARCHAR(64)  NOT NULL COMMENT '角色编码（super_admin）',
    `name`        VARCHAR(128) NOT NULL COMMENT '角色名称',
    `description` VARCHAR(512) DEFAULT NULL COMMENT '描述',
    `user_count`  INT          NOT NULL DEFAULT 0 COMMENT '关联用户数',
    `permissions` JSON         DEFAULT NULL COMMENT '权限编码列表',
    `category`    VARCHAR(32)  NOT NULL COMMENT '归属：admin/tenant',
    `color`       VARCHAR(32)  DEFAULT NULL COMMENT '前端主题色',
    `is_builtin`  TINYINT      NOT NULL DEFAULT 1 COMMENT '是否内置角色',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`     TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_role_key` (`role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ========== 权限表 ==========
CREATE TABLE `r_permission` (
    `id`          VARCHAR(64)  NOT NULL COMMENT '权限ID（p-001）',
    `code`        VARCHAR(128) NOT NULL COMMENT '权限编码（systems.view）',
    `name`        VARCHAR(128) NOT NULL COMMENT '权限名称',
    `module`      VARCHAR(64)  NOT NULL COMMENT '所属模块',
    `action`      VARCHAR(64)  NOT NULL COMMENT '动作（view/create/edit/...）',
    `category`    VARCHAR(32)  NOT NULL COMMENT '归属：admin/tenant',
    `description` VARCHAR(512) DEFAULT NULL COMMENT '描述',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`     TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_permission_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- ========== 页面表 ==========
CREATE TABLE `r_page` (
    `id`          VARCHAR(64)  NOT NULL COMMENT '页面ID（pg-001）',
    `name`        VARCHAR(128) NOT NULL COMMENT '页面名称',
    `path`        VARCHAR(256) NOT NULL COMMENT '路由路径',
    `module`      VARCHAR(64)  NOT NULL COMMENT '所属模块',
    `icon`        VARCHAR(64)  DEFAULT NULL COMMENT '图标名',
    `visible_to`  JSON         DEFAULT NULL COMMENT '可见角色列表',
    `sort_order`  INT          NOT NULL DEFAULT 0 COMMENT '排序',
    `enabled`     TINYINT      NOT NULL DEFAULT 1 COMMENT '是否启用',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`     TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面表';

-- ========== 退役系统表 ==========
CREATE TABLE `r_system` (
    `id`             VARCHAR(64)  NOT NULL COMMENT '系统ID（sys-001）',
    `name`           VARCHAR(128) NOT NULL COMMENT '系统名称',
    `code`           VARCHAR(64)  NOT NULL COMMENT '系统编码',
    `description`    VARCHAR(512) DEFAULT NULL COMMENT '描述',
    `owner`          VARCHAR(128) DEFAULT NULL COMMENT '负责人',
    `department`     VARCHAR(128) DEFAULT NULL COMMENT '所属部门',
    `stage`          VARCHAR(32)  NOT NULL COMMENT '阶段：active/deprecated/archived/destroyed',
    `status`         VARCHAR(32)  NOT NULL DEFAULT 'REGISTERED' COMMENT '生命周期状态（6态）',
    `created_at`     DATE         DEFAULT NULL COMMENT '注册日期',
    `archived_at`    DATE         DEFAULT NULL COMMENT '归档日期',
    `db_config`      JSON         DEFAULT NULL COMMENT '源库连接配置',
    `storage_config` JSON         DEFAULT NULL COMMENT '存储配置',
    `last_sync`      VARCHAR(64)  DEFAULT NULL COMMENT '最近同步时间',
    `sync_status`    VARCHAR(32)  DEFAULT NULL COMMENT '同步状态',
    `schema_count`   INT          NOT NULL DEFAULT 0,
    `table_count`    INT          NOT NULL DEFAULT 0,
    `data_size_gb`   INT          NOT NULL DEFAULT 0 COMMENT '数据量 GB',
    `tags`           JSON         DEFAULT NULL COMMENT '标签列表',
    `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_system_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退役系统表';

-- ========== 同步任务表 ==========
CREATE TABLE `r_sync_job` (
    `id`           VARCHAR(64)  NOT NULL COMMENT '任务ID（job-001）',
    `system_id`    VARCHAR(64)  DEFAULT NULL COMMENT '系统ID',
    `system_name`  VARCHAR(128) DEFAULT NULL COMMENT '系统名称',
    `type`         VARCHAR(32)  DEFAULT NULL COMMENT '类型：full/incremental/schema-only',
    `status`       VARCHAR(32)  NOT NULL DEFAULT 'syncing' COMMENT '状态：success/syncing/failed/partial',
    `started_at`   VARCHAR(64)  DEFAULT NULL COMMENT '开始时间',
    `duration`     VARCHAR(64)  DEFAULT NULL COMMENT '耗时',
    `records`      BIGINT       NOT NULL DEFAULT 0 COMMENT '处理记录数',
    `triggered_by` VARCHAR(128) DEFAULT NULL COMMENT '触发人',
    `logs`         JSON         DEFAULT NULL COMMENT '日志列表',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`      TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_sync_job_system` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步任务表';

-- ========== Schema 注册表 ==========
CREATE TABLE `r_schema` (
    `id`         VARCHAR(64)  NOT NULL COMMENT 'Schema ID（sc-001）',
    `system_id`  VARCHAR(64)  DEFAULT NULL COMMENT '系统ID',
    `name`       VARCHAR(128) NOT NULL COMMENT 'Schema 名称',
    `tables`     JSON         DEFAULT NULL COMMENT '表列表',
    `synced_at`  VARCHAR(64)  DEFAULT NULL COMMENT '同步时间',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`    TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_schema_system` (`system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Schema 注册表';

-- ========== 物理表元数据表 ==========
CREATE TABLE `r_physical_table` (
    `id`         VARCHAR(64)  NOT NULL COMMENT '表ID（t-001）',
    `name`       VARCHAR(128) NOT NULL COMMENT '物理表名',
    `label`      VARCHAR(128) DEFAULT NULL COMMENT '中文标签',
    `system_id`  VARCHAR(64)  DEFAULT NULL COMMENT '系统ID',
    `columns`    JSON         DEFAULT NULL COMMENT '列定义列表',
    `rows`       JSON         DEFAULT NULL COMMENT '示例数据（用于配置化前端渲染）',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`    TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_physical_table_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物理表元数据表';

-- ========== 查询配置表 ==========
CREATE TABLE `r_query_config` (
    `id`           VARCHAR(64)  NOT NULL COMMENT '配置ID（qc-001）',
    `name`         VARCHAR(128) NOT NULL COMMENT '配置名称',
    `description`  VARCHAR(512) DEFAULT NULL COMMENT '描述',
    `base_table`   VARCHAR(128) NOT NULL COMMENT '基础表',
    `joins`        JSON         DEFAULT NULL COMMENT '连接定义列表',
    `fields`       JSON         DEFAULT NULL COMMENT '字段列表',
    `default_sort` JSON         DEFAULT NULL COMMENT '默认排序',
    `page_size`    INT          NOT NULL DEFAULT 10 COMMENT '默认分页大小',
    `status`       VARCHAR(32)  NOT NULL DEFAULT 'active' COMMENT '状态：active/draft',
    `created_by`   VARCHAR(128) DEFAULT NULL COMMENT '创建人',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`      TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_query_config_base` (`base_table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='查询配置表';
