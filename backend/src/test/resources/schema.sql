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

-- ========== 扩展表（V5，对齐 scripts/sql/V5__create_r_extended_tables.sql） ==========
CREATE TABLE IF NOT EXISTS `r_source_database` (
    `id` VARCHAR(64) PRIMARY KEY, `source_system_id` VARCHAR(64) NOT NULL,
    `db_type` VARCHAR(32) NOT NULL, `server` VARCHAR(255), `database_name` VARCHAR(128) NOT NULL,
    `connection_secret_ref` VARCHAR(512), `conn_string_hash` VARCHAR(128), `description` VARCHAR(512),
    `port` INT NOT NULL DEFAULT 0, `username` VARCHAR(128), `password` VARCHAR(256),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_unstructured_source` (
    `id` VARCHAR(64) PRIMARY KEY, `source_system_id` VARCHAR(64) NOT NULL, `source_type` VARCHAR(32) NOT NULL,
    `location_uri` VARCHAR(512), `mount_path` VARCHAR(255), `file_pattern` VARCHAR(255),
    `date_extraction_rule` VARCHAR(255), `description` VARCHAR(512),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_unstructured_item` (
    `id` VARCHAR(64) PRIMARY KEY, `unstructured_source_id` VARCHAR(64) NOT NULL, `original_path` VARCHAR(512),
    `original_name` VARCHAR(255) NOT NULL, `size_bytes` BIGINT NOT NULL DEFAULT 0, `content_type` VARCHAR(128),
    `last_modified` DATETIME, `derived_date` DATE, `hash` VARCHAR(128),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_archive_batch` (
    `id` VARCHAR(64) PRIMARY KEY, `archive_job_id` VARCHAR(64) NOT NULL, `batch_year` INT,
    `started_at` DATETIME, `finished_at` DATETIME, `rows_out` BIGINT NOT NULL DEFAULT 0, `bytes_out` BIGINT NOT NULL DEFAULT 0,
    `result` VARCHAR(32) NOT NULL DEFAULT 'RUNNING', `log_url` VARCHAR(512), `correlation_id` VARCHAR(64),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_archive_file` (
    `id` VARCHAR(64) PRIMARY KEY, `archive_batch_id` VARCHAR(64) NOT NULL, `schema_name` VARCHAR(128),
    `table_name` VARCHAR(128) NOT NULL, `blob_url` VARCHAR(512) NOT NULL, `size_bytes` BIGINT NOT NULL DEFAULT 0,
    `checksum` VARCHAR(128), `etag` VARCHAR(128), `created_on` DATETIME,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_archive_set` (
    `id` VARCHAR(64) PRIMARY KEY, `archive_batch_id` VARCHAR(64) NOT NULL, `set_name` VARCHAR(128) NOT NULL,
    `blob_dir_url` VARCHAR(512), `items_count` INT NOT NULL DEFAULT 0, `bytes_total` BIGINT NOT NULL DEFAULT 0, `created_on` DATETIME,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_archive_set_item` (
    `id` VARCHAR(64) PRIMARY KEY, `archive_set_id` VARCHAR(64) NOT NULL, `original_path` VARCHAR(512),
    `original_name` VARCHAR(255) NOT NULL, `blob_url` VARCHAR(512), `size_bytes` BIGINT NOT NULL DEFAULT 0,
    `checksum` VARCHAR(128), `content_type` VARCHAR(128), `copied_at` DATETIME,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_retention_policy` (
    `id` VARCHAR(64) PRIMARY KEY, `code` VARCHAR(64) NOT NULL, `name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(512), `period_days` INT NOT NULL, `start_trigger` VARCHAR(32) NOT NULL DEFAULT 'SYNC_COMPLETED', `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_retention_code ON `r_retention_policy`(`code`);

CREATE TABLE IF NOT EXISTS `r_retention_assignment` (
    `id` VARCHAR(64) PRIMARY KEY, `policy_id` VARCHAR(64) NOT NULL, `object_type` VARCHAR(32) NOT NULL,
    `object_id` VARCHAR(64) NOT NULL, `start_date` DATE, `due_date` DATE, `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    `current_hold_start` DATETIME, `current_hold_end` DATETIME, `assigned_by` VARCHAR(64), `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_legal_hold_event` (
    `id` VARCHAR(64) PRIMARY KEY, `assignment_id` VARCHAR(64) NOT NULL, `action` VARCHAR(32) NOT NULL,
    `hold_start` DATETIME, `hold_end` DATETIME, `reason` VARCHAR(512), `actor_id` VARCHAR(64), `ts` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS `r_tag` (
    `id` VARCHAR(64) PRIMARY KEY, `tag_key` VARCHAR(128) NOT NULL, `tag_value` VARCHAR(255),
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_tag_kv ON `r_tag`(`tag_key`, `tag_value`);

CREATE TABLE IF NOT EXISTS `r_object_tag` (
    `id` VARCHAR(64) PRIMARY KEY, `object_type` VARCHAR(32) NOT NULL, `object_id` VARCHAR(64) NOT NULL,
    `tag_id` VARCHAR(64) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_object_tag ON `r_object_tag`(`object_type`, `object_id`, `tag_id`);

-- ========== 仪表盘表（V7） ==========
CREATE TABLE IF NOT EXISTS `r_sync_activity` (
    `id` VARCHAR(64) PRIMARY KEY, `day_label` VARCHAR(16) NOT NULL, `activity_date` DATE,
    `success_count` INT NOT NULL DEFAULT 0, `failed_count` INT NOT NULL DEFAULT 0,
    `partial_count` INT NOT NULL DEFAULT 0, `running_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `deleted` TINYINT NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX IF NOT EXISTS uk_r_sync_activity_day ON `r_sync_activity`(`day_label`);
