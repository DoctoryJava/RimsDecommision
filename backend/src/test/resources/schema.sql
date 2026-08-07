-- H2 (MySQL 兼容模式) 测试库结构 —— 与 V3__create_r_tables.sql 对应
CREATE TABLE IF NOT EXISTS `r_user` (
    `id`         VARCHAR(64) PRIMARY KEY,
    `name`       VARCHAR(128) NOT NULL,
    `email`      VARCHAR(128) NOT NULL,
    `password`   VARCHAR(256) NOT NULL,
    `avatar`     VARCHAR(16),
    `role_code`  VARCHAR(64)  NOT NULL,
    `category`   VARCHAR(32)  NOT NULL,
    `system_ids` VARCHAR(8000),
    `status`     VARCHAR(16)  NOT NULL DEFAULT 'active',
    `last_login` DATETIME,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`    TINYINT  NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_user_email ON `r_user`(`email`);

CREATE TABLE IF NOT EXISTS `r_role` (
    `id`          VARCHAR(64) PRIMARY KEY,
    `role_key`    VARCHAR(64) NOT NULL,
    `name`        VARCHAR(128) NOT NULL,
    `description` VARCHAR(512),
    `user_count`  INT NOT NULL DEFAULT 0,
    `permissions` VARCHAR(8000),
    `category`    VARCHAR(32) NOT NULL,
    `color`       VARCHAR(32),
    `is_builtin`  TINYINT NOT NULL DEFAULT 1,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`     TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_role_key ON `r_role`(`role_key`);

CREATE TABLE IF NOT EXISTS `r_permission` (
    `id`          VARCHAR(64) PRIMARY KEY,
    `code`        VARCHAR(128) NOT NULL,
    `name`        VARCHAR(128),
    `module`      VARCHAR(64) NOT NULL,
    `action`      VARCHAR(64) NOT NULL,
    `category`    VARCHAR(32) NOT NULL,
    `description` VARCHAR(512),
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`     TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_permission_code ON `r_permission`(`code`);

CREATE TABLE IF NOT EXISTS `r_page` (
    `id`          VARCHAR(64) PRIMARY KEY,
    `name`        VARCHAR(128) NOT NULL,
    `path`        VARCHAR(256) NOT NULL,
    `module`      VARCHAR(64) NOT NULL,
    `icon`        VARCHAR(64),
    `visible_to`  VARCHAR(8000),
    `sort_order`  INT NOT NULL DEFAULT 0,
    `enabled`     TINYINT NOT NULL DEFAULT 1,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`     TINYINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `r_system` (
    `id`             VARCHAR(64) PRIMARY KEY,
    `name`           VARCHAR(128) NOT NULL,
    `code`           VARCHAR(64) NOT NULL,
    `description`    VARCHAR(512),
    `owner`          VARCHAR(128),
    `department`     VARCHAR(128),
    `stage`          VARCHAR(32) NOT NULL,
    `status`         VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
    `created_at`     DATE,
    `archived_at`    DATE,
    `db_config`      VARCHAR(8000),
    `storage_config` VARCHAR(8000),
    `last_sync`      VARCHAR(64),
    `sync_status`    VARCHAR(32),
    `schema_count`   INT NOT NULL DEFAULT 0,
    `table_count`    INT NOT NULL DEFAULT 0,
    `data_size_gb`   INT NOT NULL DEFAULT 0,
    `tags`           VARCHAR(8000),
    `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`        TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_system_code ON `r_system`(`code`);

CREATE TABLE IF NOT EXISTS `r_sync_job` (
    `id`           VARCHAR(64) PRIMARY KEY,
    `system_id`    VARCHAR(64),
    `system_name`  VARCHAR(128),
    `type`         VARCHAR(32),
    `status`       VARCHAR(32) NOT NULL DEFAULT 'syncing',
    `started_at`   VARCHAR(64),
    `duration`     VARCHAR(64),
    `records`      BIGINT NOT NULL DEFAULT 0,
    `triggered_by` VARCHAR(128),
    `logs`         VARCHAR(8000),
    `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`      TINYINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `r_schema` (
    `id`         VARCHAR(64) PRIMARY KEY,
    `system_id`  VARCHAR(64),
    `name`       VARCHAR(128) NOT NULL,
    `tables`     VARCHAR(8000),
    `synced_at`  VARCHAR(64),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`    TINYINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS `r_physical_table` (
    `id`         VARCHAR(64) PRIMARY KEY,
    `name`       VARCHAR(128) NOT NULL,
    `label`      VARCHAR(128),
    `system_id`  VARCHAR(64),
    `columns`    VARCHAR(8000),
    `rows`       VARCHAR(8000),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`    TINYINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_physical_table_name ON `r_physical_table`(`name`);

CREATE TABLE IF NOT EXISTS `r_query_config` (
    `id`           VARCHAR(64) PRIMARY KEY,
    `name`         VARCHAR(128) NOT NULL,
    `description`  VARCHAR(512),
    `base_table`   VARCHAR(128) NOT NULL,
    `joins`        VARCHAR(8000),
    `fields`       VARCHAR(8000),
    `default_sort` VARCHAR(8000),
    `page_size`    INT NOT NULL DEFAULT 10,
    `status`       VARCHAR(32) NOT NULL DEFAULT 'active',
    `created_by`   VARCHAR(128),
    `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted`      TINYINT NOT NULL DEFAULT 0
);
