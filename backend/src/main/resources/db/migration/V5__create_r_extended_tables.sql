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
CREATE TABLE `r_source_database` (
    `id`                  VARCHAR(64)  NOT NULL COMMENT '源数据库ID',
    `source_system_id`    VARCHAR(64)  NOT NULL COMMENT '所属系统ID（r_system.id）',
    `db_type`             VARCHAR(32)  NOT NULL COMMENT '数据库类型：MYSQL/ORACLE/POSTGRESQL/SQLSERVER/MONGODB',
    `server`              VARCHAR(255) DEFAULT NULL COMMENT '服务器地址',
    `database_name`       VARCHAR(128) NOT NULL COMMENT '数据库名',
    `connection_secret_ref` VARCHAR(512) DEFAULT NULL COMMENT '连接凭据的密钥引用（Key Vault/Secret Scope）',
    `conn_string_hash`    VARCHAR(128) DEFAULT NULL COMMENT '连接串哈希（用于变更检测）',
    `description`         VARCHAR(512) DEFAULT NULL COMMENT '描述',
    `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`             TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_source_db_system` (`source_system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='源数据库表';

-- ========== 非结构化数据源（UnstructuredSource）==========
CREATE TABLE `r_unstructured_source` (
    `id`                   VARCHAR(64)  NOT NULL COMMENT '非结构化源ID',
    `source_system_id`     VARCHAR(64)  NOT NULL COMMENT '所属系统ID（r_system.id）',
    `source_type`          VARCHAR(32)  NOT NULL COMMENT '类型：FILE_SHARE/AZURE_BLOB/AWS_S3/ADLS/MINIO',
    `location_uri`         VARCHAR(512) DEFAULT NULL COMMENT '源位置 URI',
    `mount_path`           VARCHAR(255) DEFAULT NULL COMMENT '挂载路径',
    `file_pattern`         VARCHAR(255) DEFAULT NULL COMMENT '文件匹配模式（如 *.pdf）',
    `date_extraction_rule` VARCHAR(255) DEFAULT NULL COMMENT '归档日期提取规则（从文件名/路径/属性）',
    `description`          VARCHAR(512) DEFAULT NULL COMMENT '描述',
    `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`              TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_unstruct_src_system` (`source_system_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='非结构化数据源表';

-- ========== 非结构化条目（UnstructuredItem）==========
CREATE TABLE `r_unstructured_item` (
    `id`                   VARCHAR(64)  NOT NULL COMMENT '条目ID',
    `unstructured_source_id` VARCHAR(64) NOT NULL COMMENT '所属非结构化源ID（r_unstructured_source.id）',
    `original_path`        VARCHAR(512) DEFAULT NULL COMMENT '原始路径',
    `original_name`        VARCHAR(255) NOT NULL COMMENT '原始文件名',
    `size_bytes`           BIGINT       NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    `content_type`         VARCHAR(128) DEFAULT NULL COMMENT 'MIME 类型',
    `last_modified`        DATETIME     DEFAULT NULL COMMENT '源文件最后修改时间',
    `derived_date`         DATE         DEFAULT NULL COMMENT '推导出的归档归属日期',
    `hash`                 VARCHAR(128) DEFAULT NULL COMMENT '内容哈希（用于去重/校验）',
    `created_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`              TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_unstruct_item_source` (`unstructured_source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='非结构化条目表';

-- ========== 归档批次（ArchiveBatch）==========
-- 一次 ArchiveJob 执行产生一个批次，记录吞吐与结果；一个 Job 可有多个批次（按年/周期）。
CREATE TABLE `r_archive_batch` (
    `id`             VARCHAR(64)  NOT NULL COMMENT '批次ID',
    `archive_job_id` VARCHAR(64)  NOT NULL COMMENT '归档任务ID（r_sync_job.id）',
    `batch_year`     INT          DEFAULT NULL COMMENT '归档归属年份（按日期切片）',
    `started_at`     DATETIME     DEFAULT NULL COMMENT '开始时间',
    `finished_at`    DATETIME     DEFAULT NULL COMMENT '结束时间',
    `rows_out`       BIGINT       NOT NULL DEFAULT 0 COMMENT '输出行数',
    `bytes_out`      BIGINT       NOT NULL DEFAULT 0 COMMENT '输出字节数',
    `result`         VARCHAR(32)  NOT NULL DEFAULT 'RUNNING' COMMENT '结果：RUNNING/SUCCESS/FAILED/PARTIAL',
    `log_url`        VARCHAR(512) DEFAULT NULL COMMENT '运行日志 URL',
    `correlation_id` VARCHAR(64)  DEFAULT NULL COMMENT '关联 ID（分布式追踪）',
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_batch_job` (`archive_job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='归档批次表';

-- ========== 归档文件（ArchiveFile，结构化表归档产物）==========
CREATE TABLE `r_archive_file` (
    `id`             VARCHAR(64)  NOT NULL COMMENT '归档文件ID',
    `archive_batch_id` VARCHAR(64) NOT NULL COMMENT '所属批次ID（r_archive_batch.id）',
    `schema_name`    VARCHAR(128) DEFAULT NULL COMMENT '源 Schema 名',
    `table_name`     VARCHAR(128) NOT NULL COMMENT '源表名',
    `blob_url`       VARCHAR(512) NOT NULL COMMENT '归档对象地址（ADLS/Blob/Iceberg 文件）',
    `size_bytes`     BIGINT       NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    `checksum`       VARCHAR(128) DEFAULT NULL COMMENT '校验和',
    `etag`           VARCHAR(128) DEFAULT NULL COMMENT '存储 ETag',
    `created_on`     DATETIME     DEFAULT NULL COMMENT '归档创建时间',
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_archive_file_batch` (`archive_batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='归档文件表';

-- ========== 归档集（ArchiveSet，非结构化文件集归档产物）==========
CREATE TABLE `r_archive_set` (
    `id`             VARCHAR(64)  NOT NULL COMMENT '归档集ID',
    `archive_batch_id` VARCHAR(64) NOT NULL COMMENT '所属批次ID（r_archive_batch.id）',
    `set_name`       VARCHAR(128) NOT NULL COMMENT '归档集名称',
    `blob_dir_url`   VARCHAR(512) DEFAULT NULL COMMENT '归档集目录地址',
    `items_count`    INT          NOT NULL DEFAULT 0 COMMENT '条目数量',
    `bytes_total`    BIGINT       NOT NULL DEFAULT 0 COMMENT '总字节数',
    `created_on`     DATETIME     DEFAULT NULL COMMENT '创建时间',
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_archive_set_batch` (`archive_batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='归档集表';

-- ========== 归档集条目（ArchiveSetItem）==========
CREATE TABLE `r_archive_set_item` (
    `id`             VARCHAR(64)  NOT NULL COMMENT '条目ID',
    `archive_set_id` VARCHAR(64)  NOT NULL COMMENT '所属归档集ID（r_archive_set.id）',
    `original_path`  VARCHAR(512) DEFAULT NULL COMMENT '原始路径',
    `original_name`  VARCHAR(255) NOT NULL COMMENT '原始文件名',
    `blob_url`       VARCHAR(512) DEFAULT NULL COMMENT '归档对象地址',
    `size_bytes`     BIGINT       NOT NULL DEFAULT 0 COMMENT '文件大小（字节）',
    `checksum`       VARCHAR(128) DEFAULT NULL COMMENT '校验和',
    `content_type`   VARCHAR(128) DEFAULT NULL COMMENT 'MIME 类型',
    `copied_at`      DATETIME     DEFAULT NULL COMMENT '复制时间',
    `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`        TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_archive_set_item_set` (`archive_set_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='归档集条目表';

-- ========== 保留策略（RetentionPolicy）==========
CREATE TABLE `r_retention_policy` (
    `id`            VARCHAR(64)  NOT NULL COMMENT '策略ID',
    `code`          VARCHAR(64)  NOT NULL COMMENT '策略编码（唯一）',
    `name`          VARCHAR(128) NOT NULL COMMENT '策略名称',
    `description`   VARCHAR(512) DEFAULT NULL COMMENT '描述',
    `period_days`   INT          NOT NULL COMMENT '保留天数',
    `start_trigger` VARCHAR(32)  NOT NULL DEFAULT 'SYNC_COMPLETED'
        COMMENT '起算点：SYNC_COMPLETED/INGESTION_DATE/DEPLOYMENT_DATE',
    `created_on`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`       TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_retention_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='保留策略表';

-- ========== 保留指派（RetentionAssignment）==========
-- 将保留策略应用到某个对象（系统/表/文件集），计算起止日期并跟踪法定保留状态。
CREATE TABLE `r_retention_assignment` (
    `id`                 VARCHAR(64)  NOT NULL COMMENT '指派ID',
    `policy_id`          VARCHAR(64)  NOT NULL COMMENT '保留策略ID（r_retention_policy.id）',
    `object_type`        VARCHAR(32)  NOT NULL COMMENT '对象类型：SYSTEM/TABLE/FILE_SET',
    `object_id`          VARCHAR(64)  NOT NULL COMMENT '对象ID',
    `start_date`         DATE         DEFAULT NULL COMMENT '保留起算日期',
    `due_date`           DATE         DEFAULT NULL COMMENT '到期日期',
    `status`             VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE'
        COMMENT 'ACTIVE/EXPIRED/COMPLETED/ON_HOLD',
    `current_hold_start` DATETIME     DEFAULT NULL COMMENT '当前法定保留开始',
    `current_hold_end`   DATETIME     DEFAULT NULL COMMENT '当前法定保留结束',
    `assigned_by`        VARCHAR(64)  DEFAULT NULL COMMENT '指派人ID',
    `created_on`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`            TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_retention_ass_policy` (`policy_id`),
    KEY `idx_r_retention_ass_obj` (`object_type`, `object_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='保留指派表';

-- ========== 法定保留事件（LegalHoldEvent）==========
CREATE TABLE `r_legal_hold_event` (
    `id`            VARCHAR(64)  NOT NULL COMMENT '事件ID',
    `assignment_id` VARCHAR(64)  NOT NULL COMMENT '保留指派ID（r_retention_assignment.id）',
    `action`        VARCHAR(32)  NOT NULL COMMENT '动作：HOLD/RELEASE',
    `hold_start`    DATETIME     DEFAULT NULL COMMENT '开始法定保留',
    `hold_end`      DATETIME     DEFAULT NULL COMMENT '结束法定保留',
    `reason`        VARCHAR(512) DEFAULT NULL COMMENT '原因/说明',
    `actor_id`      VARCHAR(64)  DEFAULT NULL COMMENT '操作人ID',
    `ts`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '事件时间',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`       TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_hold_assignment` (`assignment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='法定保留事件表';

-- ========== 标签（Tag）==========
CREATE TABLE `r_tag` (
    `id`         VARCHAR(64)  NOT NULL COMMENT '标签ID',
    `tag_key`    VARCHAR(128) NOT NULL COMMENT '标签键',
    `tag_value`  VARCHAR(255) DEFAULT NULL COMMENT '标签值',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`    TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_tag_kv` (`tag_key`, `tag_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- ========== 对象标签（ObjectTag）==========
CREATE TABLE `r_object_tag` (
    `id`          VARCHAR(64)  NOT NULL COMMENT '对象标签ID',
    `object_type` VARCHAR(32)  NOT NULL COMMENT '对象类型：TABLE/FILE_SET/UNSTRUCTURED_SOURCE/SYSTEM',
    `object_id`   VARCHAR(64)  NOT NULL COMMENT '对象ID',
    `tag_id`      VARCHAR(64)  NOT NULL COMMENT '标签ID（r_tag.id）',
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`     TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_r_object_tag` (`object_type`, `object_id`, `tag_id`),
    KEY `idx_r_object_tag_tag` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对象标签表';
