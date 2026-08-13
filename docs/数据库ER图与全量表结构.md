# RIMS Decommission — 数据库表结构与 ER 图

> 本文档整理**当前运行系统（`r_*` 业务表体系）**全部用到的表，并给出 ER 图与业务逻辑说明。
>
> - 元数据库：MySQL 8.0（AiCoder）
> - SSOT：`backend/src/main/resources/db/migration/`（Flyway V1–V18），同步副本 `scripts/sql/`
> - 说明：元数据库**仅存配置 / RBAC / 审计 / 归档产物元数据**，绝不存归档业务数据；归档业务数据一律经 Databricks SQL 读取。

---

## 一、总览：表清单与归属模块

### 1.1 活跃使用表（`r_*`，共 24 张，后端 Mapper 实际接入）

| 模块 | 表名 | 说明 |
| --- | --- | --- |
| **权限/访问控制** | `r_user` | 用户（邮箱登录 + BCrypt 密码，`roleCode` 关联角色） |
| | `r_role` | 角色（`roleKey` 唯一，`permissions` JSON 内嵌权限码） |
| | `r_permission` | 权限码（`code` 唯一：`module.action`） |
| | `r_page` | 页面（`visibleTo` JSON 控制可见角色，驱动动态菜单） |
| **退役系统** | `r_system` | 退役系统注册（`stage` + `status` 六态生命周期） |
| | `r_source_database` | 源数据库（一个系统可有多个库，凭据走密钥引用） |
| | `r_unstructured_source` | 非结构化数据源（文件共享 / Blob / S3 / MinIO） |
| | `r_unstructured_item` | 非结构化文件条目（路径 / 大小 / 哈希 / 推导日期） |
| | `r_schema` | Schema 注册（`tables` JSON） |
| | `r_physical_table` | 物理表元数据（列定义 + 示例行，驱动动态查询渲染） |
| **同步/归档** | `r_sync_job` | 同步任务记录（`type` full/incremental/schema-only） |
| | `r_sync_table_config` | 同步前表级配置（表选择 + `date_column` + `retain_years`） |
| | `r_sync_table_stat` | 同步任务-表级统计（行数 / 落盘大小 / blob_url / checksum） |
| | `r_sync_job_config` | 定时同步 Job 配置（cron 表达式，到点执行生命周期删除） |
| | `r_archive_batch` | 归档批次（一次 Job 运行的行数 / 字节 / 结果） |
| | `r_archive_set` | 非结构化文件集归档产物（目录 / 条目数 / 总字节） |
| | `r_archive_set_item` | 归档集内的单文件条目 |
| **保留/生命周期** | `r_retention_policy` | 保留策略（`period_days` + 起算触发点） |
| | `r_retention_assignment` | 保留指派（策略 → 对象，起止日期 + 法定保留状态） |
| | `r_legal_hold_event` | 法定保留事件（HOLD / RELEASE 审计） |
| **动态查询** | `r_query_config` | 动态查询配置（`base_table` + `joins`/`fields` JSON） |
| | `r_drill_config` | 查询配置的关联明细下钻（支持多级，`parent_id` 自引用） |
| **审计/监控** | `r_audit_log` | 审计日志（SQL 查询 / ETL 任务留痕） |
| | `r_sync_activity` | 同步活跃度（按日聚合，供 Dashboard 图表） |

### 1.2 已废弃/删除的表（历史迁移，不再使用）

| 表名 | 说明 |
| --- | --- |
| `r_archive_file` | 归档文件表 —— **V12 合并进 `r_sync_table_stat` 后删除** |
| `r_tag` / `r_object_tag` | 标签 / 对象标签 —— **V15 移除 Tags 功能后删除** |

### 1.3 遗留 schema 表（`sys_*` / `decomm_*`，V1 创建但**未接入运行链路**）

> 这些表在 V1 初始化脚本中创建，README §🗄️ 也有记录，但**当前 controller/mapper 均未接线**（仅 `DecommSystem` / `SysUser` 实体残留，`DecommSystemService` 为未接路由的死代码）。活跃系统全部走 `r_*` 表。若需清理可另行评估，不影响现有功能。

`sys_user` / `sys_role` / `sys_menu` / `sys_permission` / `sys_user_role` / `sys_role_menu` / `sys_role_permission` / `sys_audit_log` / `decomm_system` / `sys_role_system` / `decomm_db_config` / `decomm_storage_config` / `decomm_schema_registry` / `decomm_sync_job` / `decomm_sync_log` / `decomm_lifecycle_policy`

---

## 二、ER 图（Mermaid）

> 在 GitHub / Typora / VS Code 中可直接渲染。

```mermaid
erDiagram
    %% ============ 权限 / 访问控制 ============
    R_USER {
        varchar id PK
        varchar name
        varchar email UK "登录名"
        varchar password "BCrypt"
        varchar avatar
        varchar role_code FK "R_ROLE.role_key"
        varchar category "admin/tenant"
        json system_ids "R_SYSTEM.id 列表"
        varchar status "active/disabled"
        datetime last_login
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_ROLE {
        varchar id PK
        varchar role_key UK
        varchar name
        varchar description
        int user_count
        json permissions "R_PERMISSION.code 列表"
        varchar category
        varchar color
        tinyint is_builtin
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_PERMISSION {
        varchar id PK
        varchar code UK "module.action"
        varchar name
        varchar module
        varchar action
        varchar category
        varchar description
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_PAGE {
        varchar id PK
        varchar name
        varchar path
        varchar module
        varchar icon
        json visible_to "R_ROLE.role_key 列表"
        int sort_order
        tinyint enabled
        datetime created_at
        datetime updated_at
        tinyint deleted
    }

    %% ============ 退役系统 ============
    R_SYSTEM {
        varchar id PK
        varchar name
        varchar code UK
        varchar description
        varchar owner
        varchar department
        varchar stage "active/deprecated/archived/destroyed"
        varchar status "REGISTERED..DESTROYED 六态"
        date created_at
        date archived_at
        json db_config
        json storage_config
        varchar last_sync
        varchar sync_status
        int schema_count
        int table_count
        int data_size_gb
        json tags
        datetime updated_at
        tinyint deleted
    }
    R_SOURCE_DATABASE {
        varchar id PK
        varchar source_system_id FK "R_SYSTEM.id"
        varchar db_type
        varchar server
        int port
        varchar database_name
        varchar username
        varchar password "加密/密钥引用"
        varchar connection_secret_ref
        varchar conn_string_hash
        varchar description
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_UNSTRUCTURED_SOURCE {
        varchar id PK
        varchar source_system_id FK "R_SYSTEM.id"
        varchar source_type "FILE_SHARE/BLOB/S3/ADLS/MINIO"
        varchar location_uri
        varchar mount_path
        varchar file_pattern
        varchar date_extraction_rule
        varchar description
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_UNSTRUCTURED_ITEM {
        varchar id PK
        varchar unstructured_source_id FK "R_UNSTRUCTURED_SOURCE.id"
        varchar original_path
        varchar original_name
        bigint size_bytes
        varchar content_type
        datetime last_modified
        date derived_date
        varchar hash
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_SCHEMA {
        varchar id PK
        varchar system_id FK "R_SYSTEM.id"
        varchar name
        json tables
        varchar synced_at
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_PHYSICAL_TABLE {
        varchar id PK
        varchar name UK
        varchar label
        varchar system_id FK "R_SYSTEM.id"
        json columns "列定义"
        json rows "示例数据"
        datetime created_at
        datetime updated_at
        tinyint deleted
    }

    %% ============ 同步 / 归档 ============
    R_SYNC_JOB {
        varchar id PK
        varchar system_id FK "R_SYSTEM.id"
        varchar system_name
        varchar type "full/incremental/schema-only"
        varchar status "success/syncing/failed/partial"
        varchar started_at
        varchar duration
        bigint records
        varchar triggered_by
        json logs
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_SYNC_TABLE_CONFIG {
        varchar id PK
        varchar system_id FK "R_SYSTEM.id"
        varchar source_database_id FK "R_SOURCE_DATABASE.id"
        varchar table_name
        tinyint enabled "是否同步"
        varchar date_column "时间字段"
        int retain_years "保留最近N年"
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_SYNC_TABLE_STAT {
        varchar id PK
        varchar job_id FK "R_SYNC_JOB.id"
        varchar system_id FK "R_SYSTEM.id"
        varchar database_name
        varchar table_name
        bigint row_count
        bigint size_bytes
        varchar schema_name
        varchar blob_url "归档对象地址"
        varchar checksum
        varchar etag
        datetime created_on
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_SYNC_JOB_CONFIG {
        varchar id PK
        varchar system_id FK "R_SYSTEM.id"
        varchar job_name
        varchar cron_expr "Spring 6段"
        tinyint enabled
        datetime last_run_at
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_ARCHIVE_BATCH {
        varchar id PK
        varchar archive_job_id FK "R_SYNC_JOB.id"
        int batch_year
        datetime started_at
        datetime finished_at
        bigint rows_out
        bigint bytes_out
        varchar result "RUNNING/SUCCESS/FAILED/PARTIAL"
        varchar log_url
        varchar correlation_id
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_ARCHIVE_SET {
        varchar id PK
        varchar archive_batch_id FK "R_ARCHIVE_BATCH.id"
        varchar set_name
        varchar blob_dir_url
        int items_count
        bigint bytes_total
        datetime created_on
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_ARCHIVE_SET_ITEM {
        varchar id PK
        varchar archive_set_id FK "R_ARCHIVE_SET.id"
        varchar original_path
        varchar original_name
        varchar blob_url
        bigint size_bytes
        varchar checksum
        varchar content_type
        datetime copied_at
        datetime created_at
        datetime updated_at
        tinyint deleted
    }

    %% ============ 保留 / 生命周期 ============
    R_RETENTION_POLICY {
        varchar id PK
        varchar code UK
        varchar name
        varchar description
        int period_days
        varchar start_trigger "SYNC_COMPLETED/INGESTION_DATE/DEPLOYMENT_DATE"
        datetime created_on
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_RETENTION_ASSIGNMENT {
        varchar id PK
        varchar policy_id FK "R_RETENTION_POLICY.id"
        varchar object_type "SYSTEM/TABLE/FILE_SET"
        varchar object_id "多态对象ID"
        date start_date
        date due_date
        varchar status "ACTIVE/EXPIRED/COMPLETED/ON_HOLD"
        datetime current_hold_start
        datetime current_hold_end
        varchar assigned_by
        datetime created_on
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_LEGAL_HOLD_EVENT {
        varchar id PK
        varchar assignment_id FK "R_RETENTION_ASSIGNMENT.id"
        varchar action "HOLD/RELEASE"
        datetime hold_start
        datetime hold_end
        varchar reason
        varchar actor_id
        datetime ts
        datetime created_at
        datetime updated_at
        tinyint deleted
    }

    %% ============ 动态查询 ============
    R_QUERY_CONFIG {
        varchar id PK
        varchar system_id FK "R_SYSTEM.id"
        varchar name
        varchar description
        varchar base_table "基础表"
        json joins "连接定义"
        json fields "字段列表"
        json default_sort
        int page_size
        varchar status "active/draft"
        varchar created_by
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_DRILL_CONFIG {
        varchar id PK
        varchar query_config_id FK "R_QUERY_CONFIG.id"
        varchar parent_id FK "R_DRILL_CONFIG.id" "多级下钻"
        varchar name
        varchar base_table "子表 db.table"
        varchar parent_field "上级外键字段"
        varchar child_field "子表关联字段"
        json fields
        int sort_order
        datetime created_at
        datetime updated_at
        tinyint deleted
    }

    %% ============ 审计 / 监控 ============
    R_AUDIT_LOG {
        varchar id PK
        varchar operator
        varchar action_type "query/etl"
        text sql_text
        varchar status "started/success/failed"
        varchar system_id FK "R_SYSTEM.id"
        json detail "数据库/行数/时长/错误"
        datetime executed_at
        datetime created_at
        datetime updated_at
        tinyint deleted
    }
    R_SYNC_ACTIVITY {
        varchar id PK
        varchar day_label UK "Mon/Sun"
        date activity_date
        int success_count
        int failed_count
        int partial_count
        int running_count
        datetime created_at
        datetime updated_at
        tinyint deleted
    }

    %% ============ 关系 ============
    R_ROLE ||--o{ R_USER : "roleKey 归属"
    R_SYSTEM ||--o{ R_SOURCE_DATABASE : "拥有源库"
    R_SYSTEM ||--o{ R_UNSTRUCTURED_SOURCE : "拥有非结构化源"
    R_UNSTRUCTURED_SOURCE ||--o{ R_UNSTRUCTURED_ITEM : "包含条目"
    R_SYSTEM ||--o{ R_SCHEMA : "注册 Schema"
    R_SYSTEM ||--o{ R_PHYSICAL_TABLE : "物理表元数据"
    R_SYSTEM ||--o{ R_SYNC_JOB : "产生同步任务"
    R_SYSTEM ||--o{ R_SYNC_TABLE_CONFIG : "表级同步配置"
    R_SOURCE_DATABASE ||--o{ R_SYNC_TABLE_CONFIG : "同步目标源库"
    R_SYSTEM ||--o{ R_SYNC_JOB_CONFIG : "定时任务配置"
    R_SYSTEM ||--o{ R_QUERY_CONFIG : "查询配置归属"
    R_SYNC_JOB ||--o{ R_SYNC_TABLE_STAT : "表级统计"
    R_SYNC_JOB ||--o{ R_ARCHIVE_BATCH : "归档批次"
    R_ARCHIVE_BATCH ||--o{ R_ARCHIVE_SET : "包含归档集"
    R_ARCHIVE_SET ||--o{ R_ARCHIVE_SET_ITEM : "包含文件条目"
    R_RETENTION_POLICY ||--o{ R_RETENTION_ASSIGNMENT : "指派到对象"
    R_RETENTION_ASSIGNMENT ||--o{ R_LEGAL_HOLD_EVENT : "法定保留事件"
    R_QUERY_CONFIG ||--o{ R_DRILL_CONFIG : "下钻配置"
    R_DRILL_CONFIG ||--o{ R_DRILL_CONFIG : "parent 自引用多级下钻"
    R_SYSTEM ||--o{ R_AUDIT_LOG : "可选关联系统"
```

---

## 三、各模块业务逻辑说明

### 模块 A · 权限与访问控制（RBAC）

| 逻辑 | 涉及表 | 说明 |
| --- | --- | --- |
| 登录认证 | `r_user` | 以 `email` 作为登录名，密码 BCrypt 校验（`DbUserDetailsService`） |
| 角色归属 | `r_user.role_code` → `r_role.role_key` | 一个用户挂一个角色，前端据此渲染菜单 |
| 权限码 | `r_role.permissions[]` ↔ `r_permission.code` | 角色以 JSON 内嵌权限码列表；`code` 为 `module.action` 形式 |
| 动态菜单 | `r_page.visible_to[]` ↔ `r_role.role_key` | 页面可见角色列表，驱动动态菜单（`PageController`） |
| 系统级隔离 | `r_user.system_ids[]` → `r_system.id` | 用户可见的退役系统范围（多系统隔离） |

### 模块 B · 退役系统登记与配置（Phase 1）

| 逻辑 | 涉及表 | 说明 |
| --- | --- | --- |
| 系统注册 | `r_system` | 录入名称、编码（`code` 唯一）、部门、负责人、`stage` 与 `status` 六态 |
| 生命周期状态机 | `r_system.status` | `REGISTERED → CONFIGURED → SYNCING → ARCHIVED → EXPIRING → DESTROYED` |
| 源库连接 | `r_source_database` | 一个系统可有多个源库；`connection_secret_ref` 指向 Key Vault，`conn_string_hash` 用于变更检测 |
| 非结构化源 | `r_unstructured_source` | 文件共享 / Blob / S3 / ADLS / MinIO，含文件匹配模式与日期提取规则 |
| 非结构化条目 | `r_unstructured_item` | 每个源下的文件条目，记录大小 / 哈希 / 推导归档日期 |
| Schema 注册 | `r_schema` | 每个系统的 Schema，`tables` JSON 记录表列表 |
| 物理表元数据 | `r_physical_table` | 列定义 + 示例行，驱动配置化前端渲染 |

### 模块 C · 数据同步与入湖（Phase 2）

| 逻辑 | 涉及表 | 说明 |
| --- | --- | --- |
| 同步前表级配置 | `r_sync_table_config` | 每库每表配置 `enabled`（是否同步）、`date_column`（年份判断字段）、`retain_years`（保留最近 N 年，同步时删除更早数据） |
| 同步任务 | `r_sync_job` | 记录任务类型（full/incremental/schema-only）、状态、进度、`triggered_by` |
| 表级统计 | `r_sync_table_stat` | 每个任务每张表同步的行数 / 落盘大小 / blob_url / checksum（V12 合并了原 `r_archive_file`） |
| 定时任务 | `r_sync_job_config` | 每系统 cron 表达式，到点触发生命周期保留删除 |
| 归档批次 | `r_archive_batch` | 一次 Job 运行的输出行数 / 字节 / 结果，`archive_job_id` 关联 `r_sync_job` |
| 非结构化归档 | `r_archive_set` / `r_archive_set_item` | 文件集目录 + 单文件条目（blob_url / 大小 / checksum） |

### 模块 D · 保留策略与生命周期（Phase 4）

| 逻辑 | 涉及表 | 说明 |
| --- | --- | --- |
| 保留策略 | `r_retention_policy` | `period_days` + `start_trigger`（SYNC_COMPLETED / INGESTION_DATE / DEPLOYMENT_DATE） |
| 保留指派 | `r_retention_assignment` | 策略应用到对象（SYSTEM/TABLE/FILE_SET），计算 `start_date`/`due_date`，跟踪状态 |
| 法定保留 | `r_legal_hold_event` | 对指派做 HOLD / RELEASE，记录原因、操作人、时间，支撑合规举证 |

### 模块 E · 元数据驱动动态查询（Phase 3）

| 逻辑 | 涉及表 | 说明 |
| --- | --- | --- |
| 查询配置 | `r_query_config` | `base_table` + `joins`/`fields` JSON，定义一张查询视图 |
| 下钻配置 | `r_drill_config` | `query_config_id` 关联查询配置；`parent_id` 自引用支持多级下钻（order → order_items → shipments），`parent_field`/`child_field` 定义关联键 |
| 数据读取 | （外部 Databricks） | 归档业务数据经 Databricks SQL 读取，MySQL 只存配置 |

### 模块 F · 审计与监控

| 逻辑 | 涉及表 | 说明 |
| --- | --- | --- |
| 审计日志 | `r_audit_log` | 记录 SQL 查询 / ETL 任务：操作人、类型、SQL 文本、状态、详情 JSON |
| 同步活跃度 | `r_sync_activity` | 按日聚合 success/failed/partial/running 计数，供 Dashboard「同步活跃度」图表 |

---

## 四、关键关联速查

| 关系 | 关联字段 |
| --- | --- |
| 用户 → 角色 | `r_user.role_code` = `r_role.role_key` |
| 用户 → 系统 | `r_user.system_ids`（JSON 列表）= `r_system.id` |
| 系统 → 源库 | `r_source_database.source_system_id` = `r_system.id` |
| 系统 → 非结构化源 | `r_unstructured_source.source_system_id` = `r_system.id` |
| 非结构化源 → 条目 | `r_unstructured_item.unstructured_source_id` = `r_unstructured_source.id` |
| 系统 → Schema | `r_schema.system_id` = `r_system.id` |
| 系统 → 物理表 | `r_physical_table.system_id` = `r_system.id` |
| 系统 → 同步任务 | `r_sync_job.system_id` = `r_system.id` |
| 任务 → 表级统计 | `r_sync_table_stat.job_id` = `r_sync_job.id` |
| 表级配置 → 源库 | `r_sync_table_config.source_database_id` = `r_source_database.id` |
| 系统 → 定时任务 | `r_sync_job_config.system_id` = `r_system.id` |
| 任务 → 归档批次 | `r_archive_batch.archive_job_id` = `r_sync_job.id` |
| 批次 → 归档集 | `r_archive_set.archive_batch_id` = `r_archive_batch.id` |
| 归档集 → 条目 | `r_archive_set_item.archive_set_id` = `r_archive_set.id` |
| 策略 → 指派 | `r_retention_assignment.policy_id` = `r_retention_policy.id` |
| 指派 → 法定保留 | `r_legal_hold_event.assignment_id` = `r_retention_assignment.id` |
| 查询配置 → 下钻 | `r_drill_config.query_config_id` = `r_query_config.id` |
| 下钻 → 父级下钻 | `r_drill_config.parent_id` = `r_drill_config.id`（自引用） |
| 审计 → 系统 | `r_audit_log.system_id` = `r_system.id`（可选） |

---

## 五、迁移与演进记录（Flyway）

| 版本 | 内容 |
| --- | --- |
| V1 | 初始化 schema（`sys_*` / `decomm_*` 遗留表 + `r_*` 未建） |
| V3 | 创建 9 张 `r_*` 核心表（用户/角色/权限/页面/系统/同步任务/Schema/物理表/查询配置） |
| V5 | 创建 12 张归档保留扩展表（源库/非结构化/归档批次/归档集/保留策略/标签等） |
| V7 | 创建 `r_sync_activity` 仪表盘聚合表 |
| V10 | 创建 `r_sync_table_stat`（同步任务-表级统计） |
| V11 | `r_query_config` 增加 `system_id` |
| V12 | 合并 `r_archive_file` → `r_sync_table_stat`，删除 `r_archive_file` |
| V13 | 创建 `r_drill_config`（多级下钻） |
| V14 | 创建 `r_audit_log` |
| V15 | 删除 `r_tag` / `r_object_tag`（移除 Tags 功能） |
| V16 | `r_sync_job` 增加 `(deleted, created_at)` 索引，修复排序内存溢出 |
| V17 | 创建 `r_sync_table_config`（同步前表级配置） |
| V18 | 创建 `r_sync_job_config`（定时同步 Job 配置） |
