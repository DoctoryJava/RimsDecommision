-- ================================================================
-- RIMS Decommission - 查询配置的关联明细下钻配置
-- Flyway Migration V13__create_drill_config.sql
-- 支持多级下钻：order -> order_items -> shipments
-- parent_id 引用同表的父级下钻配置（顶层为 NULL，挂在查询配置的主表下）
-- ================================================================

CREATE TABLE `r_drill_config` (
    `id`              VARCHAR(64)  NOT NULL COMMENT '下钻配置ID',
    `query_config_id` VARCHAR(64)  NOT NULL COMMENT '所属查询配置（r_query_config.id）',
    `parent_id`       VARCHAR(64)  DEFAULT NULL COMMENT '父级下钻配置ID（多级下钻，顶层为 NULL）',
    `name`            VARCHAR(128) NOT NULL COMMENT '下钻名称（如：订单行/物流/备注）',
    `base_table`      VARCHAR(255) NOT NULL COMMENT '子表（db.table，已同步的 Iceberg 表）',
    `parent_field`    VARCHAR(128) NOT NULL COMMENT '父（上级）记录里的外键字段',
    `child_field`     VARCHAR(128) NOT NULL COMMENT '子表里的关联字段',
    `fields`          JSON         DEFAULT NULL COMMENT '子表要显示的字段列表',
    `sort_order`      INT          NOT NULL DEFAULT 0 COMMENT '排序',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted`         TINYINT      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_r_drill_config_query` (`query_config_id`),
    KEY `idx_r_drill_config_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='查询配置-关联明细下钻配置表';
