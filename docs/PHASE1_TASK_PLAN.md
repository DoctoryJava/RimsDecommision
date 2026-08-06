# Phase 1 任务计划 — 基础归档与查询 (RIMS Decommission)

> **版本**：v1.0  
> **日期**：2026-08-06  
> **分支**：`arena/019fd5f0-rimsdecommision`  
> **基线数据**：`task.csv` (114 行，含表头) → 本阶段 26 项  
> **关联文件**：`docs/phase1_tasks.csv` (Phase1 子集)  
> **上游文档**：`README.md` / `AGENTS.md` / `CLAUDE.md` / `scripts/sql/` / `scripts/databricks/`

---

## 目录

- [1. 文档说明](#1-文档说明)
- [2. Phase1 整体目标与价值](#2-phase1-整体目标与价值)
- [3. 范围界定](#3-范围界定)
- [4. 功能蓝图与模块拆解](#4-功能蓝图与模块拆解)
- [5. 技术实现映射](#5-技术实现映射)
- [6. 详细任务清单（26 项）](#6-详细任务清单26-项)
- [7. 里程碑与交付计划](#7-里程碑与交付计划)
- [8. 非功能性要求](#8-非功能性要求)
- [9. 验收标准与交付物](#9-验收标准与交付物)
- [10. 依赖、风险与应对](#10-依赖风险与应对)
- [附录](#附录)

---

## 1. 文档说明

### 1.1 目的

本文档将 `task.csv` 中 **Phase1：基础归档与查询** 的 26 项功能需求转化为可执行的研发与交付计划，作为 RIMS Decommission 平台 **MVP（最小可验证版本）** 的实施基线。

- 明确 Phase1 的业务价值与成功标准；
- 将 6 个功能模块、7 个业务场景、10 个关键功能、26 个具体功能落到系统设计与代码实现；
- 定义里程碑、工期、依赖与验收口径，支撑项目管理与 GitHub 协同。

### 1.2 术语

| 缩写 | 全称 | 说明 |
|------|------|------|
| RIMS | Records & Information Management System | 本平台 |
| Lakehouse | 湖仓一体 | ADLS Gen2 + Iceberg + Databricks |
| UC | Unity Catalog | Databricks 数据治理与脱敏 |
| SAS | Shared Access Signature | Blob 附件 15 分钟限时访问凭证 |
| 归档系统 | Decommission System | 已退役的源系统 (CRM_V1 等) |
| Schema Registry | `decomm_schema_registry` | 元数据库中的 JSON Schema 驱动配置 |

### 1.3 基线数据统计

```text
task.csv 全量：113 条需求行 + 1 表头 = 114 行
  Phase1 基础归档与查询       26 条 (22.8%)
  Phase2 能力优化与冷数据承接 63 条 (55.3%)
  Phase3 AI智能化赋能         24 条 (21.1%)

Phase1 按模块分布：
  模块 1 存量历史数据迁移与标准化         7 条
  模块 3 记录归档与档案全生命周期管理     2 条
  模块 4 数据存储与境内数据安全管控       3 条
  模块 6 合规管控、审计追踪与合规报表     7 条
  模块 5 档案检索、智能发现与业务利用     5 条
  模块 8 系统全局治理、运维与监控         2 条
```

> 明细见同目录 `phase1_tasks.csv`，与 `task.csv` 同构（6 列：阶段/功能模块/业务场景/关键功能/具体功能/功能描述），可直接用于任务导入、测试用例追溯与进度跟踪。

---

## 2. Phase1 整体目标与价值

### 2.1 一句话目标

> **在退役系统服务器销毁前，完成历史数据 1:1 原样入湖、境内合规存储、基础可查与审计可溯，交付可支撑 QA/IT 日常查阅与基础审计的最小闭环。**

### 2.2 承接的业务痛点

来自 `AGENTS.md - 一、业务背景`：

1. **不合规**：审计要求历史数据保留 N 年（3/5/7/10 年），服务器销毁即丢失风险；
2. **不可查**：分散在旧 ERP/CRM/OA 中，出问题时无法快速溯源；
3. **不可管**：各退役系统烟囱式存储，缺乏统一台账与生命周期管理。

### 2.3 Phase1 解决路径

```text
旧系统下线 → RIMS 接管 → 批量导入(JDBC/文件/离线包) → 完整性校验 → Iceberg 入湖(ADLS Gen2)
         → 境内驻留 + 加密存储 → 标准归档模型 → 动态查询(关键词/系统/时间) + 在线预览(SAS)
         → 操作审计 + 统一台账 + 角色权限 → 满足合规审计的最小可用闭环
```

### 2.4 成功度量 (KPI)

| 指标 | Phase1 目标 | 测量方式 |
|------|------------|----------|
| 结构化数据迁移成功率 | ≥99.9% 行级一致 | 迁移前后一致性报告比对 |
| 非结构化文件完整性 | 100% 校验通过 | SHA256 前后比对 |
| 归档查询可用性 | ≥99.5% | Databricks SQL 成功率 |
| 查询 P95 延迟 | ≤3s (1000 万行表) | 审计日志统计 |
| 境内数据驻留合规率 | 100% | 存储账户区域审计 |
| 审计日志覆盖率 | 100% 写操作 | `sys_audit_log` 抽检 |

---

## 3. 范围界定

### 3.1 Phase1 在范围内 (Must Have)

| 领域 | 包含能力 |
|------|----------|
| **迁移入库** | 结构化批量导入、非结构化/离线包导入、导入规则配置、任务调度与监控、完整性三件套（基准记录/比对/报告） |
| **归档模型** | 标准归档对象定义（记录/附件/版本/关联）、归档目录结构管理（企业模板） |
| **存储安全** | 境内驻留部署、加密存储、密钥生命周期管理 |
| **检索利用** | 关键词/按系统/按时间检索、列表展示（分页/排序）、常见文件在线预览 |
| **合规审计** | 归档/查询/导出三类操作日志、按系统/时间/类型的台账统计与报表导出 |
| **治理运维** | 基础角色权限（管理员/查询员/审计员）、本地账号管理 |

### 3.2 明确不在 Phase1（放入 Phase2/3）

| 能力 | 归属 | Phase1 替代方案 |
|------|------|-----------------|
| 实时增量同步、CDC、事件触发 | Phase2 模块2/7 | 本期仅一次性全量批量，不做常态化 |
| 冷数据自动识别与分层存储 | Phase2 模块4 | 统一热存储 |
| 字段级脱敏策略配置与预览 | Phase2 模块4 | 依赖 UC 统一 MASK，Phase1 仅对 `isPii` 字段做基础脱敏，不开放自助配置页 |
| 个性化页面/视图、组合检索 | Phase2 模块5 | 基础检索三件套 |
| 连接器模板库、第三方工具适配 | Phase2 模块7 | JDBC/文件直连 |
| AI 文档解析/语义检索/智能推荐 | Phase3 | 不涉及 |
| Legal Hold、自动到期销毁 | Phase2 模块3 | Phase1 仅台账提示，销毁能力在 `data_destroy_notebook.py` 具备但默认关闭 `auto_destroy=0` |

### 3.3 阶段边界图

```text
Phase1 (本期)        Phase2                Phase3
[批量全量归档]  →  [常态化增量/冷数据]  →  [AI 赋能]
[基础查询]      →  [高级/个性化检索]   →  [语义/问答]
[基础审计]      →  [电子签名/整改闭环] →  [智能风险预警]
[角色权限]      →  [细粒度/审批流]     →  [智能推荐]
```

---

## 4. 功能蓝图与模块拆解

### 4.1 整体功能地图

```text
Phase1：基础归档与查询
├── 模块 1 存量历史数据迁移与标准化 (7)
│   ├── 退役系统历史数据全量入库归档
│   │   ├── 历史数据批量导入 (2)
│   │   ├── 迁移规则配置 (1)
│   │   └── 迁移任务管理 (1)
│   └── 确保迁移过程数据完整可追溯
│       └── 迁移完整性校验 (3)
├── 模块 3 记录归档与档案全生命周期管理 (2)
│   └── 异构数据统一归档至标准档案模型
│       └── 标准归档模型管理 (2)
├── 模块 4 数据存储与境内数据安全管控 (3)
│   └── 满足数据不出境和本地化合规要求
│       ├── 境内数据驻留管理 (1)
│       └── 数据加密与密钥管理 (2)
├── 模块 5 档案检索、智能发现与业务利用 (5)
│   └── QA/IT人员日常基础数据查阅
│       ├── 基础档案检索 (3)
│       └── 检索结果展示与预览 (2)
├── 模块 6 合规管控、审计追踪与合规报表 (7)
│   ├── 基础运维核查与简易审计调取
│   │   └── 用户操作审计追踪 (3)
│   └── 退役系统归档数据统一台账
│       └── 归档统计与基础报表 (4)
└── 模块 8 系统全局治理、运维与监控 (2)
    └── 基础运维核查与简易审计调取
        └── 用户与角色管理 (2)
```

### 4.2 核心业务流程（Phase1 版）

```text
管理员              RIMS 后端                Databricks / Azure
  │  注册退役系统 ──▶ decomm_system (REGISTERED)
  │  配置 DB/存储 ──▶ decomm_db_config / decomm_storage_config (加密存储 → Key Vault)
  │  配置 Schema  ──▶ decomm_schema_registry (JSON, 驱动前端)
  │  触发同步      ──▶ decomm_sync_job (PENDING) ──▶ data_sync_notebook
  │                     轮询 runId             ◀──  JDBC 1:1 抽取 → Iceberg → ADLS Gen2
  │                     更新 row_count                         注册 UC: lake.{code}.{table}
  │  完整性校验    ──▶ 基准 SHA/行数 ──▶ 比对 ──▶ 一致性报告
  │
用户 (VIEWER)       动态查询
  │  选系统/表     ──▶ GET /api/systems/{id}/schemas → 渲染 DynamicFilterForm/Table
  │  关键词/系统/时间检索 ──▶ POST /api/systems/{id}/query → DynamicQueryBuilder → Databricks SQL
  │  列表/预览     ◀── UC Mask 脱敏后结果 + SAS 预览 (≤15min)
  │
审计员             台账与审计
  │  GET /api/audit/logs /api/lifecycle/...  ──▶ sys_audit_log 聚合 → Excel/PDF 导出
```

### 4.3 模块 1：存量历史数据迁移与标准化（7 项）

**定位**：Phase1 的入口与最大工作量，占 27%。解决“全量入库 + 可追溯”。

| 关键功能 | 具体功能 | 要点 |
|----------|----------|------|
| 历史数据批量导入 | 结构化批量导入 | JDBC 并行抽取（MySQL/Oracle/PostgreSQL/SQL Server），Iceberg 写入 ADLS，支持 `OVERWRITE` 幂等重试；参数组装见 `AGENTS.md 逻辑一` |
| | 非结构化/离线包导入 | 支持附件/普通文件/DB备份包/压缩包；大文件分片续传、中断重传；保留原始文件名/时间戳/路径；压缩包自动解压与清单解析 |
| 迁移规则配置 | 数据导入规则配置 | 源字段→RIMS 标准字段映射、类型转换、正则校验、必填校验；在 `Schema Registry` 配置层可视化编辑 |
| 迁移任务管理 | 导入任务调度与监控 | 项目/批次维度调度，实时进度（PENDING/RUNNING/SUCCESS/FAILED）、错误明细、重试入口 |
| 迁移完整性校验 | 基准记录/比对/报告 | 迁移前记录行数/Checksum/文件指纹；迁移后逐表/逐文件比对；自动生成数量/字段/版本对比报告（PDF/Excel） |

**涉及表/组件**：`decomm_system`, `decomm_db_config`, `decomm_storage_config`, `decomm_sync_job`, `decomm_sync_log`, `decomm_schema_registry` + `DatabricksJobManager` + `data_sync_notebook.py`

### 4.4 模块 3：记录归档与档案全生命周期管理（2 项）

| 关键功能 | 具体功能 | 要点 |
|----------|----------|------|
| 标准归档模型管理 | 标准归档对象定义 | 定义记录-附件-版本三元组及关联关系；通过 `schema_json.attachmentConfig` 声明外键；字段引用统一元数据模型；1:1 原样入湖，不做宽表合并（红线5） |
| | 归档目录结构管理 | 基于企业模板按业务类型生成目录树（章节/文件夹/预留位置），支持版本化 |

> 该模块是 Phase2 冷数据分类归档的前置，Phase1 仅交付模型定义与目录生成能力。

### 4.5 模块 4：数据存储与境内数据安全管控（3 项）

| 关键功能 | 具体功能 | 要点 |
|----------|----------|------|
| 境内数据驻留管理 | 境内驻留部署 | 所有 ADLS/Blob/MySQL/Redis 必须位于中国境内区域（如 East Asia / China North）；容灾副本亦同域；部署清单需可审计 |
| 数据加密与密钥管理 | 数据加密存储 + 密钥管理 | 传输 TLS 1.2+，存储 SSE/AES-256；密钥在 Azure Key Vault / Secret Scope 中创建/轮换/权限控制/审计；代码零明文（红线2） |

**合规映射**：满足《数据安全法》《个人信息保护法》“数据不出境”要求；为 Phase2 字段级脱敏、灾备演练打基础。

### 4.6 模块 5：档案检索、智能发现与业务利用（5 项）

**定位**：用户价值闭环，面向 QA/IT 日常查阅。

| 关键功能 | 具体功能 | 验收要点 |
|----------|----------|----------|
| 基础档案检索 | 关键词检索 | 对标题/元数据/OCR文本 `LIKE %keyword%`，结合 Databricks SQL |
| | 按系统名称检索 | `system_code` 精确筛选，下拉来自 `decomm_system` |
| | 按业务时间检索 | `created_at/modified_at/biz_date` 的 `date-range` 控件，BETWEEN 语义 |
| 检索结果展示与预览 | 列表展示 | 基于 `schema.columns.showInList/listWidth/alias` 动态表格，支持分页（默认 20/最大 100）、排序 |
| | 在线预览 | PDF/图片/Office 通过 SAS URL 直连预览；无下载落地；记录 `sys_audit_log` |

**前端核心**：`DynamicFilterForm` / `DynamicDataTable` / `DynamicColumn`（见 `CLAUDE.md` 前端规范），所有渲染由 Schema Registry 驱动。

### 4.7 模块 6：合规管控、审计追踪与合规报表（7 项）

| 关键功能 | 具体功能 | 说明 |
|----------|----------|------|
| 用户操作审计追踪 | 归档操作日志/查询日志/导出日志 | 写操作（导入/归档/修改/删除）与读操作（检索/预览/导出）均写入 `sys_audit_log`，字段含用户/时间/对象/结果/IP；支持按系统/用户/时间筛选 |
| 归档统计与基础报表 | 按系统/时间/类型统计 + 导出 | 统计各系统记录数/容量/附件数、月度增长趋势、结构化/非结构化占比；Excel/PDF 导出 |

**与模块 8 的分工**：模块 6 侧重“事后可追溯”，模块 8 侧重“事前可授权”。

### 4.8 模块 8：系统全局治理、运维与监控（2 项）

| 关键功能 | 具体功能 | 说明 |
|----------|----------|------|
| 用户与角色管理 | 基础角色权限配置 | 预置 `SUPER_ADMIN/SYSTEM_ADMIN/DATA_OPERATOR/AUDITOR/VIEWER`，按角色分配菜单/数据范围/记录类型/操作权限；映射到 `sys_role` + `sys_role_system` + UC `GRANT SELECT` |
| | 用户账号管理 | 本地账号 CRUD、启用/禁用、密码重置、有效期；JWT + Redis Token |

> Phase1 仅基础 RBAC，细粒度记录/字段级与审批流在 Phase2 完善。

---

## 5. 技术实现映射

### 5.1 架构对应（来自 README / AGENTS）

| Phase1 能力 | 后端实现 | 前端实现 | 存储/计算 |
|-------------|----------|----------|-----------|
| 批量导入 | `SystemSyncService` + `DatabricksJobManager.submitJob` | 系统配置向导 `system-config/` | Databricks Job `data_sync_notebook.py` → ADLS Gen2/Iceberg |
| 完整性校验 | `MigrationIntegrityService` (SHA256/行数) | 报告页 | MySQL 校验基准表 |
| 标准归档模型 | `SchemaRegistryService` CRUD | `schema-registry/` | `decomm_schema_registry.schema_json` |
| 境内驻留/加密 | `KeyVaultService` + `AdlsService` | 部署文档 | Azure China 区域存储 + Key Vault |
| 检索 | `DynamicQueryBuilder` + `DatabricksSqlExecutor` | `archive-query/` + `dynamic/*` | Databricks SQL + UC Mask |
| 预览 | `BlobSasService.generateSasUrl(15min)` | iframe/pdf.js/img | Blob Storage |
| 审计/报表 | `AuditLogService` AOP 切面 | `audit/` | `sys_audit_log` |
| 角色权限 | Spring Security + RBAC | `system/` + Pinia `usePermissionStore` | MySQL + UC GRANT |
| 生命周期 | `decomm_lifecycle_policy` (notify) | 仪表盘 | 定时扫描（仅提示） |

### 5.2 关键约束（CLAUDE.md 红线）

1. **元数据与数据分离**：业务数据查询严禁走 MySQL，必须经 Databricks SQL；
2. **零明文凭据**：DB/Storage/Databricks Token 经 Key Vault/Secret Scope；
3. **脱敏走 UC**：前端与 Java 均不做手动脱敏，Column Mask 统一在 UC；
4. **SAS 限时**：附件 URL ≤15 分钟，后端校验 RBAC + 路径前缀；
5. **1:1 原样**：保留源字段名/类型/精度，中文仅通过 `alias` 展示。

### 5.3 数据库变更

- 仅新增 Flyway 脚本 `V3__phase1_*.sql`，不修改 `V1__init_schema.sql` / `V2__init_data.sql`；
- 涉及表：`decomm_system`, `decomm_schema_registry`, `decomm_sync_job`, `sys_audit_log` 等已具备，Phase1 主要是数据填充与索引优化。

### 5.4 接口清单（Phase1 最小集）

```text
POST /api/auth/login, GET /api/auth/user-info
GET  /api/systems, POST /api/systems, PUT /api/systems/{id}
GET/POST /api/systems/{id}/db-config, POST /api/systems/{id}/db-config/test
GET/POST /api/systems/{id}/storage-config, POST /api/systems/{id}/storage-config/test
GET  /api/systems/{id}/schemas, POST /api/systems/{id}/schemas, PUT/DELETE /api/systems/{id}/schemas/{sid}
POST /api/systems/{id}/schemas/discover
POST /api/sync/jobs, GET /api/sync/jobs, GET /api/sync/jobs/{id}, GET /api/sync/jobs/{id}/logs
POST /api/systems/{id}/query, GET /api/systems/{id}/tables
GET  /api/systems/{id}/attachments/sas
GET  /api/audit/logs, GET /api/audit/logs/export
GET  /api/lifecycle/policies, GET /api/lifecycle/expiring
GET  /api/users, POST /api/users, PUT /api/users/{id}
GET  /api/roles, PUT /api/roles/{id}/systems, PUT /api/roles/{id}/menus
```

---

## 6. 详细任务清单（26 项）

> **来源**：`docs/phase1_tasks.csv`（与 `task.csv` 中 Phase1 行完全一致，27 行含表头）。下表增加 `任务ID` 与 `优先级` 便于研发跟踪。

| 任务ID | 功能模块 | 业务场景 | 关键功能 | 具体功能 | 功能描述 | 优先级 | 关联模块/接口 |
|--------|----------|----------|----------|----------|----------|--------|---------------|
| P1-001 | 模块 1：存量历史数据迁移与标准化 | 退役系统历史数据全量入库归档 | 历史数据批量导入 | 结构化历史数据批量导入 | 支持从退役系统批量提取结构化历史数据，并按照既定迁移范围和映射规则导入RIMS。 | P0 | data_sync_notebook, DatabricksJobManager |
| P1-002 | 模块 1 | 退役系统历史数据全量入库归档 | 历史数据批量导入 | 非结构化文件及离线包批量导入 | 支持从多种文件来源和离线介质批量导入附件、普通文件、数据库备份包及压缩归档包，并保障大文件及传输中断场景下的可靠导入、原始属性保留和文件包解析。 | P0 | AdlsService, BlobSasService |
| P1-003 | 模块 1 | 退役系统历史数据全量入库归档 | 迁移规则配置 | 数据导入规则配置 | 面向退役系统迁移项目，配置源数据与RIMS标准字段的对应关系、格式转换和校验规则，并在导入过程中执行。 | P0 | SchemaRegistryService |
| P1-004 | 模块 1 | 退役系统历史数据全量入库归档 | 迁移任务管理 | 导入任务调度与监控 | 支持迁移项目和迁移批次的任务安排、进度跟踪、异常提示及问题处理。 | P0 | decomm_sync_job, 轮询 |
| P1-005 | 模块 1 | 确保迁移过程数据完整可追溯 | 迁移完整性校验 | 迁移前完整性基准记录 | 在迁移前记录文件或数据集的完整性校验信息，作为迁移完成后的比对基准。 | P1 | MigrationIntegrityService |
| P1-006 | 模块 1 | 确保迁移过程数据完整可追溯 | 迁移完整性校验 | 迁移后完整性比对 | 迁移完成后对源端与目标端数据进行完整性比对，识别缺失、损坏或异常变更。 | P1 | 同上 |
| P1-007 | 模块 1 | 确保迁移过程数据完整可追溯 | 迁移完整性校验 | 迁移一致性报告 | 自动生成迁移前后数据数量、字段、版本的对比报告。 | P1 | 报表导出 |
| P1-008 | 模块 3 | 异构数据统一归档至标准档案模型 | 标准归档模型管理 | 标准归档对象定义 | 定义记录、附件、版本及其关联关系等标准归档对象结构，并明确归档对象如何引用统一元数据模型中的字段。 | P0 | schema_json |
| P1-009 | 模块 3 | 异构数据统一归档至标准档案模型 | 标准归档模型管理 | 归档目录结构管理 | 基于企业模板和业务类型生成标准化归档目录，建立章节层级、文件夹结构及预留位置。 | P1 | 目录服务 |
| P1-010 | 模块 4 | 满足数据不出境和本地化合规要求 | 境内数据驻留管理 | 境内数据驻留部署 | 确保RIMS元数据、业务数据及相关副本在符合要求的中国境内环境中存储和处理。 | P0 | 部署/ADLS 配置 |
| P1-011 | 模块 4 | 满足数据不出境和本地化合规要求 | 数据加密与密钥管理 | 数据加密存储 | 支持归档数据在存储和传输过程中的加密保护，防止未授权读取和数据泄露。 | P0 | KeyVaultService |
| P1-012 | 模块 4 | 满足数据不出境和本地化合规要求 | 数据加密与密钥管理 | 密钥管理 | 支持加密密钥的创建、保管、更新、权限控制和操作审计。 | P0 | KeyVault/Secret Scope |
| P1-013 | 模块 5 | QA/IT人员日常基础数据查阅 | 基础档案检索 | 关键词检索 | 支持对归档记录标题、元数据、OCR文本进行关键词检索。 | P0 | DynamicQueryBuilder LIKE |
| P1-014 | 模块 5 | QA/IT人员日常基础数据查阅 | 基础档案检索 | 按系统名称检索 | 支持按来源系统名称筛选和检索对应归档数据。 | P0 | system_code 精确 |
| P1-015 | 模块 5 | QA/IT人员日常基础数据查阅 | 基础档案检索 | 按业务时间检索 | 支持按创建时间、修改时间、业务发生时间等时间维度检索。 | P0 | date-range |
| P1-016 | 模块 5 | QA/IT人员日常基础数据查阅 | 检索结果展示与预览 | 检索结果列表展示 | 以列表形式展示检索结果，支持结果分批查看、排序和关键字段展示。 | P0 | DynamicDataTable |
| P1-017 | 模块 5 | QA/IT人员日常基础数据查阅 | 检索结果展示与预览 | 原始文件在线预览 | 支持常见文档、图片及办公文件在线预览，无需下载即可查看内容。 | P0 | SAS 预览 |
| P1-018 | 模块 6 | 基础运维核查与简易审计调取 | 用户操作审计追踪 | 归档操作日志记录 | 记录数据导入、上传、归档、修改、删除等操作，包含用户、时间、对象、结果。 | P0 | sys_audit_log AOP |
| P1-019 | 模块 6 | 基础运维核查与简易审计调取 | 用户操作审计追踪 | 查询操作日志记录 | 记录用户的检索、查看、预览行为，支持审计追溯。 | P0 | AuditLogService |
| P1-020 | 模块 6 | 基础运维核查与简易审计调取 | 用户操作审计追踪 | 导出操作日志记录 | 记录数据导出行为，包含导出范围、导出时间、导出人和下载IP。 | P0 | 同上 |
| P1-021 | 模块 6 | 退役系统归档数据统一台账 | 归档统计与基础报表 | 按系统统计归档数据量 | 统计各来源系统的归档记录数、存储容量、附件数量。 | P1 | 聚合计表 |
| P1-022 | 模块 6 | 退役系统归档数据统一台账 | 归档统计与基础报表 | 按时间统计归档数据量 | 按年/月/季度统计归档数据增长趋势。 | P1 | 同上 |
| P1-023 | 模块 6 | 退役系统归档数据统一台账 | 归档统计与基础报表 | 按数据类型统计归档量 | 区分结构化数据、非结构化文档、附件等类型进行统计。 | P1 | 同上 |
| P1-024 | 模块 6 | 退役系统归档数据统一台账 | 归档统计与基础报表 | 基础报表导出 | 支持台账统计报表导出为Excel/PDF格式。 | P1 | 导出服务 |
| P1-025 | 模块 8 | 基础运维核查与简易审计调取 | 用户与角色管理 | 基础角色权限配置 | 配置管理员、查询员、审计员等基础角色，并按角色统一分配菜单权限、数据范围、记录类型和操作权限。 | P0 | RBAC + UC GRANT |
| P1-026 | 模块 8 | 基础运维核查与简易审计调取 | 用户与角色管理 | 用户账号管理 | 支持本地账号创建、启用/禁用、密码重置、账号有效期管理。 | P0 | sys_user |

> 注：P0 为 MVP 阻塞项（18 项），P1 为强需求（8 项）；Phase1 不设 P2。

### 6.1 任务依赖图（简）

```text
P1-010(驻留) → P1-011/012(加密/密钥) → P1-001/002(导入) → P1-005/006/007(校验)
                                    ↘ P1-003(规则) ↗
P1-008(模型) → P1-009(目录) → P1-001
P1-025/026(RBAC) → P1-013~017(检索) → P1-018~020(审计) → P1-021~024(报表)
```

---

## 7. 里程碑与交付计划

### 7.1 总体节奏（建议 8 周，4 个 Sprint）

| 里程碑 | 时间 | 核心交付 | 关联任务 | 负责人 | 退出标准 |
|--------|------|----------|----------|--------|----------|
| **M0 基线** | W0 (2026-08-06) | 本计划 + `phase1_tasks.csv` 入库 GitHub | — | PM | 文档合入 `arena/019fd5f0` 并推送 |
| **Sprint 1：地基** | W1-W2 | 境内存储+加密+密钥、RBAC、标准归档模型、DB/存储配置页 | P1-008,010,011,012,025,026 | 后端/运维 | ADLS 中国区域可用；Key Vault 联通；SUPER_ADMIN 可创建角色 |
| **Sprint 2：入湖** | W3-W4 | 结构化/非结构化导入、规则配置、任务调度、完整性校验、一致性报告 | P1-001~007,003,004 | 后端/数据 | 2 个示例系统（CRM_V1/HR_OLD）全量入湖成功，一致性报告 100% |
| **Sprint 3：可查** | W5-W6 | 动态查询三件套、列表、预览、目录管理 | P1-009,013~017 | 前端/后端 | QA 可按关键词/系统/时间检索并预览文件；P95 <3s |
| **Sprint 4：可审与收尾** | W7-W8 | 审计日志、台账统计、报表导出、端到端联调、UAT | P1-018~024 | 全栈 | 审计日志覆盖率 100%；台账导出可用；UAT 通过；打 Tag `phase1-rc1` |

### 7.2 甘特（简化）

```text
W1  W2  W3  W4  W5  W6  W7  W8
■■  ■■                  基建/RBAC/模型
    ■■  ■■  ■■          迁移入湖 + 校验
            ■■  ■■      检索/预览/目录
                ■■  ■■  审计/报表/UAT
```

### 7.3 分支与发布策略

- 开发分支：`arena/019fd5f0-rimsdecommision`（本分支）
- 提交规范：`feat(phase1): P1-xxx 简述` / `docs(phase1): ...`
- 合并策略：Sprint 结束合入 `main` 并打 Tag `v0.1.0-phase1-sprintN`
- 发布物：Docker 镜像 + Flyway 脚本 + Databricks Notebook 快照

---

## 8. 非功能性要求

| 维度 | Phase1 要求 | 实现要点 |
|------|-------------|----------|
| **合规** | 境内驻留 100%、传输/存储加密、操作审计 | Key Vault + TLS + SSE；所有写操作 AOP 日志 |
| **安全** | 零明文、SAS ≤15min、UC Mask 脱敏、RBAC | Secret Scope；`CLAUDE.md` 红线 1-5 |
| **性能** | 查询 P95 ≤3s；导入 TB 级分片并行 | Databricks 集群 `auto-terminate 10min` + 分片；SQL 默认 `LIMIT 100`/`max 10000` |
| **可靠** | 导入幂等、断点续传、失败重试 | Iceberg OVERWRITE + 任务状态机 |
| **可观测** | 同步日志、审计日志、存储容量告警 | `decomm_sync_log` + `sys_audit_log` |
| **兼容** | 源 DB 支持 MySQL/Oracle/PG/SQLServer | JDBC 抽象层 |
| **国际化** | 前端中英双语，`alias` 中文 | i18n |

---

## 9. 验收标准与交付物

### 9.1 验收清单（UAT）

| 编号 | 场景 | 步骤 | 预期 |
|------|------|------|------|
| UAT-01 | 结构化导入 | 注册 CRM_V1 → 配置 MySQL → 导入 10 万行 CUSTOMER_ORDER | 入湖行数一致，一致性报告通过；列表可查 |
| UAT-02 | 非结构化导入 | 上传 500MB 压缩包（含 200 PDF + 50 图片）→ 中断后重试 | 文件数、大小、Checksum 100% 一致，原始属性保留 |
| UAT-03 | 规则配置 | 配置字段映射与正则校验（含非法数据）→ 导入 | 异常数据被拦截并提示 |
| UAT-04 | 完整性 | 导出迁移前基准 → 完成迁移 → 比对 | 基准/比对行一致，报告可导出 PDF |
| UAT-05 | 目录 | 按模板生成归档目录 → 校验层级 | 章节/文件夹正确生成 |
| UAT-06 | 驻留/加密 | 检查 ADLS 区域、加密状态、Key Vault 审计 | 均在中国境内且加密启用 |
| UAT-07 | 检索 | 关键词“张”+ 系统 CRM_V1 + 时间 2020 组合检索 | 返回正确且 P95 <3s；分页/排序可用 |
| UAT-08 | 预览 | 点击附件预览 PDF/图片 | SAS URL 15 分钟内可用，超时失效；Office 可预览 |
| UAT-09 | 审计 | 执行导入/查询/导出 → 查看审计日志 | 三类日志完整，含 IP 与结果 |
| UAT-10 | 台账 | 查看按系统/时间/类型统计 → 导出 Excel | 数据与入湖一致，可导出 |
| UAT-11 | 权限 | VIEWER 仅可见授权系统；AUDITOR 只读 | RBAC + UC 权限校验通过 |

### 9.2 交付物清单

| 类别 | 交付物 | 位置 |
|------|--------|------|
| 文档 | 本计划 + phase1_tasks.csv | `docs/PHASE1_TASK_PLAN.md`, `docs/phase1_tasks.csv` |
| 后端 | 系统配置/同步/查询/审计/SAS/RBAC 模块 | `backend/src/main/java/...` |
| 前端 | 配置向导、动态查询、审计、台账页 | `frontend/src/views/...`, `components/dynamic/` |
| 数据 | Flyway V3 脚本、初始数据 | `scripts/sql/V3__phase1_*.sql` |
| 大数据 | Notebook 快照 | `scripts/databricks/data_sync_notebook.py` 等 |
| 部署 | docker-compose / 环境变量样例 | `docker-compose.yml`, `.env.example` |
| 测试 | 单元/接口/UAT 用例 | `backend/src/test/`, `docs/UAT.md` |

---

## 10. 依赖、风险与应对

### 10.1 外部依赖

| 依赖 | 影响任务 | 状态与应对 |
|------|----------|------------|
| Azure 中国区域订阅与配额（ADLS/Blob/Key Vault） | P1-010/011/012 | 提前申请；准备本地 MinIO Mock 便于离线开发 |
| Databricks Workspace + UC 权限 | P1-001/013 | 申请 `lake` catalog 写权限；本地用 Stub 模拟 SQL |
| 源系统 DB 访问与脱敏样例数据 | P1-001/002 | 协调业务方提供脱敏 Dump；准备合成数据兜底 |
| 网络打通（VNet/防火墙） | 全量 | 提前联调连通性测试页 |

### 10.2 风险矩阵

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 大文件/大表超时或 OOM | 中 | 高 | 分片并行 + 流式写入 + `data_compaction` |
| 境内合规审计不通过 | 低 | 高 | 部署前区域合规 Checklist 双人复核 |
| UC Mask 与 RBAC 权限不一致导致泄露/不可见 | 中 | 高 | 权限矩阵单测 + 越权负向测试 |
| 迁移一致性校验遗漏导致数据丢失未发现 | 中 | 高 | 强制基准记录 + 自动化比对 + 人工抽检 |
| Databricks 成本超支 | 中 | 中 | 集群 auto-terminate + 查询限流 + 成本告警 |
| 前端动态渲染与 Schema 演进不兼容 | 低 | 中 | Schema 版本化 + 前端容错 |

### 10.3 决策记录（ADR 候选）

- ADR-001：Phase1 仅支持一次性全量，不做 CDC（已决策）；
- ADR-002：附件预览统一走 SAS，不落地前端缓存（已决策）；
- ADR-003：一致性报告采用 SHA256 + 行数双校验（已决策）。

---

## 附录

### A. 文件变更记录

| 日期 | 版本 | 变更 | 作者 |
|------|------|------|------|
| 2026-08-06 | v1.0 | 初始版本，基于 `task.csv` 生成 26 项 Phase1 明细与计划 | Arena Agent |

### B. 快速验证

```bash
# 校验 Phase1 行数
csvcut -c 1 task.csv | grep -c "Phase1"  # 期望 26
# 或
python -c "import csv; print(len([r for r in csv.reader(open('task.csv', encoding='utf-8-sig')) if r[0].startswith('Phase1')]))"

# 查看本阶段子集
cat docs/phase1_tasks.csv
# 查看计划
cat docs/PHASE1_TASK_PLAN.md
```

### C. 后续演进（Phase2 预告，非本期实施）

- 增量同步（CDC/事件驱动）、冷热分层、字段级脱敏自助、个性化视图、连接器模板库、合规审批流；
- 详见 `task.csv` 中 Phase2 63 项与 Phase3 24 项，将在 Phase1 交付后启动。

### D. 联系与协作

- 分支：`arena/019fd5f0-rimsdecommision` → 目标 `main`
- 提交前：`mvn test` + `pnpm lint` + `pnpm type-check`
- 提问：在 GitHub Issue 中关联 `phase1` 标签并 @PM

---

> **下一步**：请在 GitHub 上查看 `docs/phase1_tasks.csv` 与本文档，确认后按 §7 里程碑启动 Sprint 1。如有字段口径或优先级争议，请直接在 `phase1_tasks.csv` 同步更新并提交 PR。
