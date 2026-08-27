-- ================================================================
-- RIMS Decommission - 查询配置的关联明细下钻配置
-- Flyway Migration V13__create_drill_config.sql（SQL Server 版）
-- 支持多级下钻：order -> order_items -> shipments
-- parent_id 引用同表的父级下钻配置（顶层为 NULL，挂在查询配置的主表下）
-- ================================================================

-- 查询配置-关联明细下钻配置表
CREATE TABLE [r_drill_config] (
    [id] NVARCHAR(64) NOT NULL,    -- 下钻配置ID
    [query_config_id] NVARCHAR(64) NOT NULL,    -- 所属查询配置（r_query_config.id）
    [parent_id] NVARCHAR(64) NULL,    -- 父级下钻配置ID（多级下钻，顶层为 NULL）
    [name] NVARCHAR(128) NOT NULL,    -- 下钻名称（如：订单行/物流/备注）
    [base_table] NVARCHAR(255) NOT NULL,    -- 子表（db.table，已同步的 Iceberg 表）
    [parent_field] NVARCHAR(128) NOT NULL,    -- 父（上级）记录里的外键字段
    [child_field] NVARCHAR(128) NOT NULL,    -- 子表里的关联字段
    [fields] NVARCHAR(MAX) NULL,    -- 子表要显示的字段列表
    [sort_order] INT NOT NULL CONSTRAINT [df_r_drill_config_sort_order] DEFAULT 0,    -- 排序
    [created_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_drill_config_created_at] DEFAULT SYSDATETIME(),
    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [df_r_drill_config_updated_at] DEFAULT SYSDATETIME(),
    [deleted] TINYINT NOT NULL CONSTRAINT [df_r_drill_config_deleted] DEFAULT 0,
    CONSTRAINT [pk_r_drill_config] PRIMARY KEY ([id])
);
CREATE INDEX [idx_r_drill_config_query] ON [r_drill_config] ([query_config_id]);
CREATE INDEX [idx_r_drill_config_parent] ON [r_drill_config] ([parent_id]);
