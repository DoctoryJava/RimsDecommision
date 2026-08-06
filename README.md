# RIMS Decommission — 企业级多系统数据归档与生命周期管理平台

> **Data Archive Lifecycle System** — 当企业应用退役、服务器销毁时，通过湖仓一体架构实现异构数据的 1:1 原样归档、安全查询与物理销毁。

## 📋 项目定位

RIMS Decommission 解决的核心问题：

| 问题 | 解决方案 |
|------|----------|
| 旧系统（ERP/CRM/OA…）下线，服务器即将销毁 | 全量数据自动抽取，1:1 原样入湖归档 |
| 历史数据需要长期保存，满足合规审计 | Iceberg 格式归档至 Azure ADLS Gen2，支持时间旅行 |
| 归档数据需要安全查询，不能裸暴露 | Unity Catalog 统一治理 + Column Mask 字段级脱敏 |
| 不同退役系统的查询页面无法逐一开发 | Schema Registry 驱动的动态配置化前端 |
| 数据到期后需要物理销毁 | 自动化 DROP + VACUUM 物理回收 |

---

## 🏗️ 核心架构选型：湖仓一体 (Lakehouse)

系统采用 **Databricks 读写一体 + 湖仓一体 (Iceberg / ADLS Gen2) + Unity Catalog 治理 + 配置化动态前端** 架构：

```
                          ┌──────────────────────────────────────────┐
                          │         Frontend (Vue 3 + Element Plus)   │
                          │                                           │
                          │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │
                          │  │ RBAC 管理│ │ 系统配置 │ │ 动态查询  │ │
                          │  │ (静态页) │ │ (向导式) │ │ (Schema   │ │
                          │  │          │ │          │ │  驱动渲染)│ │
                          │  └──────────┘ └──────────┘ └───────────┘ │
                          └─────────────────┬────────────────────────┘
                                            │ REST API / JSON
                          ┌─────────────────┴────────────────────────┐
                          │       Backend (Java Spring Boot 3)        │
                          │                                           │
                          │  ┌────────┐ ┌────────┐ ┌────────┐       │
                          │  │ Auth + │ │ Meta   │ │ Sync   │       │
                          │  │ RBAC   │ │ Config │ │ Orch.  │       │
                          │  │ Module │ │ Module │ │ Module │       │
                          │  └────────┘ └────────┘ └────────┘       │
                          │  ┌────────┐ ┌────────┐ ┌────────┐       │
                          │  │ Query  │ │ SAS    │ │ Life-  │       │
                          │  │ Proxy  │ │ Token  │ │ cycle  │       │
                          │  │ Module │ │ Module │ │ Module │       │
                          │  └────────┘ └────────┘ └────────┘       │
                          └──┬──────┬──────┬──────┬──────┬──────────┘
                             │      │      │      │      │
                ┌────────────┘      │      │      │      └────────────┐
                ▼                   ▼      ▼      ▼                   ▼
    ┌───────────────┐   ┌───────┐ ┌────────────────────┐ ┌──────────────────┐
    │  MySQL 8.0    │   │ Redis │ │  Databricks        │ │  Azure Storage   │
    │  (元数据库)   │   │       │ │                    │ │                  │
    │               │   │       │ │  • Jobs (ETL写入)  │ │  ADLS Gen2       │
    │  • 系统配置   │   │ Token │ │  • SQL Serverless  │ │  (Iceberg/Delta) │
    │  • Schema Reg │   │ Cache │ │    (统一查询引擎)  │ │                  │
    │  • RBAC 权限  │   │       │ │  • Unity Catalog   │ │  Azure Blob      │
    │  • 审计日志   │   │       │ │    (表权限+脱敏)   │ │  (非结构化附件)  │
    │  • 销毁策略   │   │       │ │                    │ │                  │
    └───────────────┘   └───────┘ └────────────────────┘ └──────────────────┘
```

### 架构核心决议

| 层 | 技术选型 | 职责 |
|----|----------|------|
| **存储层** | Azure ADLS Gen2 + Apache Iceberg | 结构化数据归档，支持 ACID、Time Travel、Schema Evolution |
| **附件存储** | Azure Blob Storage | 非结构化文件（PDF/图片/文档），通过 SAS 令牌安全访问 |
| **计算引擎（写）** | Databricks Jobs | ETL 抽取、Compaction、数据销毁任务 |
| **查询引擎（读）** | Databricks SQL (Statement Execution API) | 所有归档数据查询统一走 Databricks SQL，强制 UC 鉴权 |
| **数据治理** | Unity Catalog (UC) | 表级权限管控、COLUMN MASK 字段脱敏、全局审计 |
| **元数据库** | MySQL 8.0 | 仅存配置元数据（系统信息、Schema Registry、销毁策略、审计日志） |
| **后端 API** | Java 17 + Spring Boot 3 | 元数据管理、初始化编排、SAS 签发、查询代理 |
| **前端** | Vue 3 + Element Plus + TypeScript | RBAC 管理页（静态）+ 动态查询页（Schema Registry 驱动渲染） |

---

## 🧩 核心业务流程

```
  ┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
  │ 1.系统登记│────▶│ 2.数据同步│────▶│ 3.归档查询   │────▶│ 4.生命周 │
  │  & 配置  │     │  & 入湖  │     │  & 安全访问  │     │  期销毁  │
  └──────────┘     └──────────┘     └──────────────┘     └──────────┘
```

### Phase 1: 系统登记与初始化配置

```
管理员登录
    │
    ├── 1. 注册退役系统（名称、编码、部门、负责人、保留年限）
    │
    ├── 2. 配置源系统数据库连接
    │       ├── DB 类型 (MySQL/Oracle/PostgreSQL/SQLServer)
    │       ├── 连接信息 (Host/Port/DB/Schema)
    │       ├── 凭据 → Azure Key Vault 加密存储
    │       └── 测试连接 → 通过后保存
    │
    ├── 3. 配置目标存储 (ADLS Gen2 / Azure Blob)
    │       ├── 存储账户 + 容器
    │       ├── SAS 连接串 → Key Vault 加密
    │       └── 测试连接 → 通过后保存
    │
    └── 4. 配置 Schema Registry（核心！）
            ├── 自动探测源表列表
            ├── 为每张表生成 Schema 描述符 (JSON)
            │       ├── 字段名、类型、主键
            │       ├── 敏感标记 (isPii)
            │       ├── 显示别名 (alias)
            │       ├── 查询控件类型 (equal/range/like/date-range)
            │       └── 附件标记 (isAttachment + objectKeyField)
            └── 人工确认 → 保存 Schema Registry
```

### Phase 2: 自动化数据同步入湖

```
管理员触发同步
    │
    ├── 1. 后端创建 SyncJob 记录 (status=PENDING)
    │
    ├── 2. 组装 Databricks Job 参数
    │       ├── 源 DB 连接 (从 Key Vault 解密)
    │       ├── 目标 ADLS 路径
    │       └── 表列表 + 格式 (Iceberg)
    │
    ├── 3. 通过 Databricks Java SDK 提交 Notebook Job
    │       ├── 1:1 原样抽取 → ADLS Gen2 (Iceberg 格式)
    │       ├── 注册到 Unity Catalog: lake.{system_code}.{table}
    │       └── 自动附件复制到 Azure Blob
    │
    ├── 4. 轮询任务状态 → 记录日志
    │
    └── 5. 同步完成 → 配置 UC 表级权限 + Column Mask 规则
```

### Phase 3: 元数据驱动的安全查询

```
用户查询归档数据
    │
    ├── 1. 前端加载 Schema Registry (JSON)
    │       → 动态渲染查询表单 + 表格列
    │
    ├── 2. 用户输入查询条件
    │       → 前端根据 Schema 校验 + 构建查询请求
    │
    ├── 3. 后端接收请求
    │       ├── 校验用户对当前系统的 RBAC 权限
    │       ├── 构建 Databricks SQL 语句
    │       └── 通过 Statement Execution API 执行
    │           (UC 自动应用 Column Mask 脱敏)
    │
    ├── 4. 附件预览/下载
    │       ├── 前端请求 SAS URL
    │       ├── 后端校验权限 → 签发 ≤15 分钟的 SAS Token
    │       └── 前端直接通过 SAS URL 访问 Azure Blob
    │
    └── 5. 记录查询审计日志
```

### Phase 4: 数据生命周期销毁

```
定时扫描到期系统
    │
    ├── 1. 扫描 ArchiveSystem 中超过 RetentionYears 的系统
    │
    ├── 2. 通知管理员确认销毁
    │
    ├── 3. 提交 Databricks 销毁任务
    │       ├── DROP TABLE lake.{system_code}.{table_name}
    │       ├── VACUUM 物理回收存储空间
    │       └── 删除 Azure Blob 附件容器
    │
    ├── 4. 清理 Unity Catalog 注册
    │
    └── 5. 记录销毁审计日志 → 更新系统状态为 DESTROYED
```

---

## 🗄️ 数据库设计（元数据库 — MySQL）

> **核心原则**: 元数据库仅存储系统配置、Schema 注册、RBAC 权限和审计日志。
> **绝不**直接存储或查询归档的业务数据。所有业务数据查询统一走 Databricks SQL。
>
> **单一数据源**：本节为 AI 与人工查阅的唯一 DDL 说明源，与 `scripts/sql/V1__init_schema.sql` 保持一致。`CLAUDE.md` 与 `AGENT.md` 不再复制表结构，所有建表/改表必须通过 Flyway 迁移脚本（`V3__*.sql`）实现。

### 权限管理模块

| 表名 | 说明 |
|------|------|
| `sys_user` | 用户表 |
| `sys_role` | 角色表 |
| `sys_menu` | 菜单/页面表（树形结构） |
| `sys_permission` | 权限表（按钮级） |
| `sys_user_role` | 用户-角色关联 |
| `sys_role_menu` | 角色-菜单关联 |
| `sys_role_permission` | 角色-权限关联 |

### 退役管理模块

| 表名 | 说明 |
|------|------|
| `decomm_system` | 退役系统注册（状态：REGISTERED → CONFIGURED → SYNCING → ARCHIVED → EXPIRING → DESTROYED） |
| `sys_role_system` | 角色-系统映射（不同角色管理不同退役系统） |
| `decomm_db_config` | 源数据库配置（连接信息加密存储） |
| `decomm_storage_config` | 目标存储配置（ADLS/Blob 连接加密） |
| `decomm_schema_registry` | **Schema 描述符注册表**（JSON 格式的表结构元数据，驱动动态前端） |
| `decomm_sync_job` | 数据同步任务记录 |
| `decomm_sync_log` | 同步任务执行日志 |
| `decomm_lifecycle_policy` | 数据生命周期策略（保留年限、销毁规则） |
| `sys_audit_log` | 全局审计日志 |

> 完整 DDL 共 12 张表，详见 `scripts/sql/V1__init_schema.sql`（303 行）。以下摘录 3 张退役域核心表的建表语句（已与 `V1` 保持一致，生产以 `V1` 为准）：

#### 退役系统注册表 `decomm_system`

```sql
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
```

#### Schema Registry 表 `decomm_schema_registry`（核心！驱动动态前端）

```sql
CREATE TABLE `decomm_schema_registry` (
    `id` BIGINT NOT NULL,
    `system_id` BIGINT NOT NULL COMMENT '退役系统ID',
    `table_name` VARCHAR(256) NOT NULL COMMENT '源表名 (e.g. CUSTOMER_ORDER)',
    `table_alias` VARCHAR(256) DEFAULT NULL COMMENT '中文别名 (e.g. 客户订单)',
    `primary_key` VARCHAR(128) DEFAULT NULL COMMENT '主键列名',
    `uc_full_name` VARCHAR(512) DEFAULT NULL COMMENT 'UC 全限定名: lake.CRM_V1.CUSTOMER_ORDER',
    `schema_json` JSON NOT NULL COMMENT '完整 Schema 描述符 (JSON, 详见 AGENT.md §3.2)',
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
```

#### 生命周期策略表 `decomm_lifecycle_policy`

```sql
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
```

> 其他 9 张表（`sys_user`/`sys_role`/`sys_menu`/`sys_permission`/`sys_user_role`/`sys_role_menu`/`sys_role_permission`/`decomm_db_config`/`decomm_storage_config`/`decomm_sync_job`/`decomm_sync_log`/`sys_audit_log` 等）及初始数据 `V2__init_data.sql` 请直接查阅 `scripts/sql/`。**禁止在 `AGENT.md` / `CLAUDE.md` 中重复复制 DDL。**

### Schema Registry JSON 结构示例

```json
{
  "tableName": "CUSTOMER_ORDER",
  "tableAlias": "客户订单",
  "primaryKey": "order_id",
  "catalogSchema": "lake.CRM_V1",
  "columns": [
    {
      "name": "order_id",
      "type": "BIGINT",
      "alias": "订单编号",
      "queryType": "equal",
      "showInList": true,
      "isPii": false
    },
    {
      "name": "customer_name",
      "type": "VARCHAR(100)",
      "alias": "客户姓名",
      "queryType": "like",
      "showInList": true,
      "isPii": true,
      "maskPolicy": "MASK_FIRST_N(4)"
    },
    {
      "name": "order_date",
      "type": "DATE",
      "alias": "下单日期",
      "queryType": "date-range",
      "showInList": true,
      "isPii": false
    }
  ],
  "isAttachmentTable": false
}
```

---

## 🛠️ 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端框架** | Vue 3 + TypeScript | 3.4+ | Composition API |
| **UI 组件库** | Element Plus | 2.x | 企业级组件 |
| **状态管理** | Pinia | 2.x | Vue 3 推荐 |
| **路由** | Vue Router | 4.x | 动态路由 |
| **HTTP** | Axios | 1.x | 请求封装 |
| **构建** | Vite | 5.x | 前端构建 |
| **后端框架** | Java + Spring Boot | 17 / 3.2+ | 主力框架 |
| **ORM** | MyBatis-Plus | 3.5+ | 元数据库操作 |
| **安全** | Spring Security + JWT | — | 认证授权 |
| **缓存** | Redis | 6+ | Token/Session 缓存 |
| **元数据库** | MySQL | 8.0 | 配置元数据 |
| **数据库迁移** | Flyway | — | Schema 版本管理 |
| **大数据引擎** | Databricks Java SDK | — | ETL + SQL 查询 |
| **数据格式** | Apache Iceberg | — | 湖仓一体归档格式 |
| **数据治理** | Unity Catalog | — | 表权限 + Column Mask |
| **对象存储** | Azure ADLS Gen2 | — | 结构化数据归档 |
| **附件存储** | Azure Blob Storage | — | 非结构化文件 |
| **密钥管理** | Azure Key Vault | — | 凭据加密 |
| **API 文档** | SpringDoc OpenAPI | 2.x | Swagger UI |
| **容器化** | Docker + Docker Compose | — | 部署 |

---

## 📁 项目结构

```text
RimsDecommision/
├── README.md                          # 项目主文档（本文件）
├── CLAUDE.md                          # AI 编码规范与指令集
├── AGENT.md                           # AI 业务领域知识库
├── .github/
│   └── copilot-instructions.md        # GitHub Copilot 指令
├── docker-compose.yml                 # 容器编排
├── docs/                              # 架构设计文档
│   ├── architecture/                  # 架构决策记录 (ADR)
│   └── api/                           # API 接口文档
├── backend/                           # Spring Boot 后端
│   └── src/main/java/com/rims/decommission/
│       ├── config/                    # Spring 配置
│       ├── security/                  # JWT + Spring Security
│       ├── controller/                # REST 控制器
│       ├── service/                   # 业务逻辑
│       ├── mapper/                    # MyBatis Mapper
│       ├── entity/                    # 数据库实体
│       ├── dto/                       # 数据传输对象
│       ├── databricks/                # Databricks SDK 集成
│       │   ├── DatabricksJobManager   # Job 提交/状态轮询
│       │   ├── DatabricksSqlExecutor  # SQL Statement Execution
│       │   └── UnityCatalogManager    # UC 表注册/权限/脱敏
│       ├── storage/                   # Azure 存储集成
│       │   ├── AdlsService            # ADLS Gen2 操作
│       │   ├── BlobSasService         # SAS 令牌签发
│       │   └── KeyVaultService        # Key Vault 加解密
│       ├── schema/                    # Schema Registry 引擎
│       │   ├── SchemaRegistryService  # Schema CRUD
│       │   └── DynamicQueryBuilder    # JSON→SQL 转换
│       └── common/                    # 通用模块
├── frontend/                          # Vue 3 前端
│   └── src/
│       ├── api/                       # 按业务域拆分的 API
│       ├── views/
│       │   ├── login/                 # 登录页
│       │   ├── dashboard/             # 仪表盘
│       │   ├── system/                # 系统管理 (RBAC)
│       │   ├── decommission/          # 退役管理
│       │   │   ├── system-config/     # 系统配置向导
│       │   │   ├── schema-registry/   # Schema 管理
│       │   │   ├── sync-monitor/      # 同步监控
│       │   │   └── archive-query/     # 归档数据查询
│       │   └── audit/                 # 审计中心
│       ├── components/
│       │   └── dynamic/               # ⭐ 动态渲染组件
│       │       ├── DynamicFilterForm  # Schema→查询表单
│       │       ├── DynamicDataTable   # Schema→数据表格
│       │       └── DynamicColumn      # 按类型渲染列
│       ├── composables/               # 组合式函数
│       ├── store/                     # Pinia Store
│       ├── router/                    # 路由（含动态路由）
│       ├── types/                     # TypeScript 类型
│       └── utils/                     # 工具函数
└── scripts/
    ├── sql/                           # Flyway 迁移脚本
    └── databricks/                    # Databricks Notebook
        ├── data_sync_notebook.py      # 数据同步入湖
        ├── data_compaction.py         # 小文件合并
        └── data_destroy_notebook.py   # 数据物理销毁
```

---

## 🚀 快速开始

### 环境要求

- JDK 17+、Maven 3.8+
- Node.js 18+、pnpm 8+
- MySQL 8.0+、Redis 6+
- Azure 订阅 (ADLS Gen2, Blob Storage, Key Vault)
- Databricks Workspace

### 本地开发

```bash
# 后端
cd backend
mvn clean package -DskipTests
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 前端
cd frontend
pnpm install
pnpm dev

# Docker Compose (仅启动基础设施)
docker-compose up -d mysql redis
```

### 环境变量（.env）

```properties
# 元数据库
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=rims_decommission
MYSQL_USERNAME=rims
MYSQL_PASSWORD=***

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Databricks
DATABRICKS_HOST=https://adb-xxx.azuredatabricks.net
DATABRICKS_TOKEN=***
DATABRICKS_CLUSTER_ID=xxx
DATABRICKS_WAREHOUSE_ID=xxx
DATABRICKS_CATALOG=lake

# Azure
AZURE_KEY_VAULT_URL=https://rims-kv.vault.azure.net
AZURE_STORAGE_ACCOUNT=rimsarchive
AZURE_BLOB_CONTAINER=attachments
```

---

## 📄 License

Internal Use Only — 仅限企业内部使用
