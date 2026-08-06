# AGENT.md — 业务领域知识与核心逻辑指南

> **本文件向 AI 解释业务场景、领域模型与算法逻辑。**
> 确保 AI 在生成代码时不偏离业务事实。与 `CLAUDE.md`（编码规范）配合使用。

---

## 一、业务背景 (Domain Context)

本系统为 **企业级系统退役归档平台**。当企业内部旧系统（如旧 ERP、旧 CRM、旧 OA）停止使用、服务器即将销毁时，本系统接管其所有历史数据，完成 **归档 → 查询 → 销毁** 全生命周期管理。

### 业务痛点

```
旧系统下线 → 服务器销毁 → 数据丢失？
                          ↓
    不合规（审计要求保留 N 年）
    不可查（出问题时无法溯源）
    不可管（分散在各系统中）
```

### 解决方案

```
旧系统下线 → RIMS 平台接管 → 1:1 原样入湖 → 安全可查 → 到期自动销毁
```

---

## 二、关键名词定义 (Glossary)

| 术语 | 英文 | 定义 |
|------|------|------|
| **归档系统** | Archive System | 已退役的原系统（如 `CRM_V1`、`HR_OLD`） |
| **Schema Registry** | Schema Registry | 记录原系统表结构、字段类型、敏感标记、查询控件类型的 JSON 配置元数据。是动态前端渲染的唯一数据源。 |
| **数据生命周期** | Data Lifecycle | 归档数据的保存期限（3年/5年/10年/永久），到期后必须物理销毁 |
| **湖仓一体** | Lakehouse | 结合数据湖 (低成本存储) 与数据仓库 (ACID 事务) 的架构，本系统使用 Iceberg 格式 |
| **Iceberg** | Apache Iceberg | 开放表格式，支持 ACID、Time Travel、Schema Evolution |
| **Unity Catalog** | UC | Databricks 的统一数据治理服务，提供表级权限 + Column Mask 脱敏 + 审计 |
| **Column Mask** | Column Mask | UC 的字段级脱敏策略，如 `MASK_FIRST_N(4)` 将"张三丰"显示为"****丰" |
| **SAS Token** | Shared Access Signature | Azure 存储的临时访问凭证，限时限权限 |
| **ADLS Gen2** | Azure Data Lake Storage Gen2 | Azure 的层级命名空间对象存储，适合大数据场景 |
| **Secret Scope** | Databricks Secret Scope | Databricks 的密钥管理机制 |
| **Statement Execution API** | — | Databricks SQL 的查询执行 API，支持异步查询 |
| **动态查询** | Dynamic Query | 根据 Schema Registry 和用户输入，动态构建 Databricks SQL 并执行 |

---

## 三、领域模型设计 (Domain Models)

### 3.1 元数据库核心表 (MySQL)

> 以下仅展示退役管理相关的核心表。RBAC 权限表 (`sys_user`, `sys_role`, `sys_menu` 等) 详见 `scripts/sql/V1__init_schema.sql`。

#### 退役系统注册表

```sql
CREATE TABLE decomm_system (
    id              BIGINT PRIMARY KEY,
    system_name     VARCHAR(128) NOT NULL,       -- 系统名称: '旧CRM系统'
    system_code     VARCHAR(64) NOT NULL,        -- 系统编码: 'CRM_V1' (全局唯一，用于 UC catalog 命名)
    description     TEXT,                        -- 系统描述
    department      VARCHAR(128),                -- 所属部门
    owner           VARCHAR(64),                 -- 负责人
    owner_email     VARCHAR(128),                -- 负责人邮箱
    status          VARCHAR(32) NOT NULL DEFAULT 'REGISTERED',
                    -- REGISTERED → CONFIGURED → SYNCING → ARCHIVED → EXPIRING → DESTROYED
    retention_years INT NOT NULL DEFAULT 7,      -- 数据保留年限
    decommission_date    DATE,                   -- 计划退役日期
    sync_completed_date  DATE,                   -- 同步完成日期 (开始计算保留期的起点)
    destroy_after_date   DATE,                   -- 到期销毁日期 = sync_completed_date + retention_years
    uc_schema_name  VARCHAR(128),                -- Unity Catalog schema 名: lake.{system_code}
    created_by      BIGINT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted         TINYINT DEFAULT 0,
    UNIQUE KEY uk_system_code (system_code)
);
```

#### Schema Registry 表（核心！驱动动态前端）

```sql
CREATE TABLE decomm_schema_registry (
    id              BIGINT PRIMARY KEY,
    system_id       BIGINT NOT NULL,             -- 关联退役系统
    table_name      VARCHAR(256) NOT NULL,       -- 源表名: 'CUSTOMER_ORDER'
    table_alias     VARCHAR(256),                -- 中文别名: '客户订单'
    primary_key     VARCHAR(128),                -- 主键列名
    uc_full_name    VARCHAR(512),                -- UC 全限定名: 'lake.CRM_V1.CUSTOMER_ORDER'
    schema_json     JSON NOT NULL,               -- 完整 Schema 描述符 (JSON)
    is_attachment_table TINYINT DEFAULT 0,       -- 是否为附件表
    attachment_base_path  VARCHAR(512),          -- 附件在 Blob 中的基础路径
    row_count       BIGINT DEFAULT 0,            -- 实际行数 (同步完成后更新)
    data_size_bytes BIGINT DEFAULT 0,            -- 实际数据大小
    status          VARCHAR(16) DEFAULT 'PENDING',-- PENDING/SYNCED/DESTROYED
    sort_order      INT DEFAULT 0,               -- 显示排序
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_system_table (system_id, table_name)
);
```

#### 生命周期策略表

```sql
CREATE TABLE decomm_lifecycle_policy (
    id              BIGINT PRIMARY KEY,
    system_id       BIGINT NOT NULL,             -- 关联退役系统
    policy_type     VARCHAR(32) NOT NULL,        -- NOTIFY / DESTROY
    trigger_days_before INT DEFAULT 30,          -- 到期前 N 天触发通知
    auto_destroy    TINYINT DEFAULT 0,           -- 是否自动销毁 (0=手动确认)
    notify_emails   VARCHAR(512),                -- 通知邮箱列表
    last_notified_at DATETIME,                   -- 最后通知时间
    destroy_status  VARCHAR(16) DEFAULT 'PENDING',-- PENDING/APPROVED/EXECUTING/COMPLETED/FAILED
    destroy_job_id  VARCHAR(64),                 -- Databricks 销毁 Job ID
    destroyed_at    DATETIME,                    -- 实际销毁时间
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.2 Schema Registry JSON 完整结构

```json
{
  "tableName": "CUSTOMER_ORDER",
  "tableAlias": "客户订单",
  "primaryKey": "order_id",
  "catalogSchema": "lake.CRM_V1",
  "defaultSort": { "column": "order_date", "direction": "DESC" },
  "columns": [
    {
      "name": "order_id",
      "dataType": "BIGINT",
      "alias": "订单编号",
      "queryType": "equal",
      "showInList": true,
      "showInDetail": true,
      "listWidth": 120,
      "isPii": false,
      "isPrimaryKey": true,
      "format": null
    },
    {
      "name": "customer_name",
      "dataType": "VARCHAR(100)",
      "alias": "客户姓名",
      "queryType": "like",
      "showInList": true,
      "showInDetail": true,
      "listWidth": 150,
      "isPii": true,
      "maskPolicy": "MASK_FULL",
      "format": null
    },
    {
      "name": "order_amount",
      "dataType": "DECIMAL(12,2)",
      "alias": "订单金额",
      "queryType": "range",
      "showInList": true,
      "showInDetail": true,
      "listWidth": 120,
      "isPii": false,
      "format": "currency:CNY"
    },
    {
      "name": "order_date",
      "dataType": "DATE",
      "alias": "下单日期",
      "queryType": "date-range",
      "showInList": true,
      "showInDetail": true,
      "listWidth": 130,
      "isPii": false,
      "format": "date:YYYY-MM-DD"
    },
    {
      "name": "status",
      "dataType": "VARCHAR(20)",
      "alias": "订单状态",
      "queryType": "select",
      "showInList": true,
      "showInDetail": true,
      "listWidth": 100,
      "isPii": false,
      "enumValues": [
        { "value": "PENDING", "label": "待处理" },
        { "value": "SHIPPED", "label": "已发货" },
        { "value": "COMPLETED", "label": "已完成" },
        { "value": "CANCELLED", "label": "已取消" }
      ]
    }
  ],
  "attachmentConfig": null
}
```

#### 附件表 Schema 示例

```json
{
  "tableName": "ORDER_ATTACHMENTS",
  "tableAlias": "订单附件",
  "isAttachmentTable": true,
  "attachmentConfig": {
    "objectKeyField": "file_path",
    "fileNameField": "file_name",
    "fileSizeField": "file_size",
    "mimeTypeField": "mime_type",
    "refForeignKey": "order_id",
    "blobContainer": "crm-v1-attachments"
  },
  "columns": [...]
}
```

### 3.3 系统状态机

```
REGISTERED ──配置完成──▶ CONFIGURED ──开始同步──▶ SYNCING
                                                    │
                                            同步完成 │
                                                    ▼
DESTROYED ◀──执行销毁── EXPIRING ◀──到期── ARCHIVED
```

| 状态 | 含义 | 可执行操作 |
|------|------|-----------|
| `REGISTERED` | 系统已注册，尚未配置 | 编辑信息、配置 DB/存储 |
| `CONFIGURED` | DB + 存储 + Schema 配置完成 | 发起同步、修改配置 |
| `SYNCING` | 数据同步中 | 查看进度、取消同步 |
| `ARCHIVED` | 数据已归档，可查询 | 查询数据、查看附件 |
| `EXPIRING` | 即将到期（通知已发送） | 确认销毁、延期 |
| `DESTROYED` | 数据已物理销毁 | 仅查看历史记录 |

---

## 四、核心业务逻辑实现指南

### 逻辑一：系统初始化与数据同步

**触发条件**: 管理员在前端完成 DB 配置 + 存储配置 + Schema Registry 配置后，点击"开始同步"。

**后端处理流程**:

```java
// SystemSyncService.triggerSync(Long systemId)

// Step 1: 校验前置条件
//   - system.status == CONFIGURED
//   - dbConfig.testStatus == SUCCESS
//   - storageConfig.testStatus == SUCCESS
//   - schemaRegistry 至少有一条记录

// Step 2: 创建同步任务记录
//   INSERT decomm_sync_job (systemId, jobType=FULL, status=PENDING)

// Step 3: 从 Key Vault 解密凭据
//   String dbPassword = keyVaultService.decrypt(dbConfig.passwordEncrypted);
//   String storageKey = keyVaultService.decrypt(storageConfig.connectionStringEncrypted);

// Step 4: 组装 Databricks Job 参数
//   Map<String, String> params = {
//     "source_db_type": dbConfig.dbType,
//     "source_host": dbConfig.host,
//     "source_port": dbConfig.port.toString(),
//     "source_database": dbConfig.databaseName,
//     "source_username": dbConfig.username,
//     "source_password": dbPassword,  // 从 Secret Scope 引用更安全
//     "source_tables": schemaRegistry.stream().map(s -> s.getTableName()).join(","),
//     "target_storage_account": storageConfig.storageAccount,
//     "target_container": storageConfig.containerName,
//     "target_format": "ICEBERG",
//     "system_code": system.systemCode,
//     "uc_catalog": "lake",
//     "uc_schema": system.systemCode
//   };

// Step 5: 通过 Databricks SDK 提交 Notebook Job
//   Long runId = databricksJobManager.submitJob("data_sync_notebook", params);
//   更新 syncJob.databricksRunId = runId, status = SUBMITTED

// Step 6: 启动异步状态轮询 (ScheduledExecutorService 或 @Async)
//   每 10 秒调用 databricksJobManager.getRunStatus(runId)
//   RUNNING → 更新进度日志
//   SUCCESS → 解析输出 JSON → 更新 syncJob + schemaRegistry.rowCount
//           → 注册 UC 表 + 配置 Column Mask
//           → 更新 system.status = ARCHIVED
//   FAILED  → 记录错误 → 更新 syncJob.status = FAILED → 告警
```

### 逻辑二：元数据驱动的配置化前端

**核心思想**: 前端不为每个退役系统编写专属页面，而是根据 Schema Registry 的 JSON 配置 **动态渲染** 查询表单和数据表格。

**前端渲染流程**:

```typescript
// views/decommission/archive-query/index.vue

// Step 1: 用户选择退役系统 → 加载 Schema Registry
const schemas = await getSchemaRegistry(systemId)
const currentSchema = schemas.find(s => s.tableName === selectedTable)

// Step 2: DynamicFilterForm 根据 schema.columns 渲染查询表单
//   column.queryType === 'equal'      → <el-input> 精确搜索
//   column.queryType === 'like'       → <el-input> 模糊搜索 (自动加 %)
//   column.queryType === 'range'      → <el-input-number> × 2 (最小值、最大值)
//   column.queryType === 'date-range' → <el-date-picker type="daterange">
//   column.queryType === 'select'     → <el-select> (选项来自 column.enumValues)
//   column.queryType === null         → 不可查询，仅展示

// Step 3: 用户填写查询条件 → 提交
const queryParams = {
  tableName: currentSchema.tableName,
  filters: [
    { field: 'customer_name', operator: 'LIKE', value: '%张%' },
    { field: 'order_date', operator: 'BETWEEN', value: ['2020-01-01', '2020-12-31'] }
  ],
  pageNum: 1,
  pageSize: 20
}

// Step 4: 后端 DynamicQueryBuilder 生成 Databricks SQL
//   SELECT order_id, customer_name, order_amount, order_date, status
//   FROM lake.CRM_V1.CUSTOMER_ORDER
//   WHERE customer_name LIKE '%张%'
//     AND order_date BETWEEN '2020-01-01' AND '2020-12-31'
//   ORDER BY order_date DESC
//   LIMIT 20 OFFSET 0

// Step 5: DatabricksSqlExecutor 执行 SQL
//   → UC 自动应用 Column Mask (customer_name 显示为 '***')
//   → 返回结果集

// Step 6: DynamicDataTable 根据 schema.columns 渲染表格
//   column.showInList === true → 显示该列
//   column.alias → 列标题
//   column.listWidth → 列宽
//   column.format === 'currency:CNY' → ¥1,234.56
//   column.format === 'date:YYYY-MM-DD' → 2020-01-15
```

### 逻辑三：附件预览与下载 (SAS 令牌)

```
用户点击"预览附件"
    │
    ├── 1. 前端调用: GET /api/systems/{id}/attachments/sas?objectKey=xxx
    │
    ├── 2. 后端校验:
    │       ├── JWT Token 有效？
    │       ├── 用户对该 system 有查询权限？(RBAC)
    │       ├── objectKey 是否在该 system 的合法路径前缀下？(防越权)
    │       └── 记录审计日志
    │
    ├── 3. 后端签发 SAS:
    │       BlobSasService.generateSasUrl(
    │           containerName,
    │           objectKey,
    │           permissions: READ,
    │           expiry: now() + 15 minutes
    │       )
    │       → 返回 https://account.blob.core.windows.net/container/path?sv=...&sig=...
    │
    └── 4. 前端直接使用 SAS URL:
            ├── PDF → 嵌入 iframe / pdf.js 预览
            ├── 图片 → <img src="sasUrl">
            ├── Office → Office Online Viewer
            └── 其他 → 下载链接
```

### 逻辑四：数据物理销毁 (Data Destruction)

**触发条件**: `decomm_system.destroy_after_date <= NOW()` 且管理员确认。

```java
// LifecycleDestroyService.executeDestroy(Long systemId)

// Step 1: 校验
//   - system.status == ARCHIVED || EXPIRING
//   - lifecyclePolicy.destroyStatus == APPROVED (管理员已确认)
//   - destroy_after_date <= now()

// Step 2: 更新状态
//   system.status = EXPIRING → DESTROYING
//   lifecyclePolicy.destroyStatus = EXECUTING

// Step 3: 提交 Databricks 销毁 Job
//   参数: system_code, table_list, uc_catalog
//   Notebook: data_destroy_notebook.py
//     FOR each table:
//       DROP TABLE IF EXISTS lake.{system_code}.{table_name};
//       -- Iceberg 表 DROP 后数据文件不会立即删除
//
//       -- 物理清除 (VACUUM 清理过期文件)
//       VACUUM delta.`abfss://container@account.dfs.core.windows.net/{path}` RETAIN 0 HOURS;

// Step 4: 删除 Azure Blob 附件
//   blobService.deleteContainer("{system_code}-attachments")

// Step 5: 清理 Unity Catalog
//   unityCatalogManager.dropSchema("lake.{system_code}")

// Step 6: 清理元数据库
//   UPDATE decomm_system SET status = 'DESTROYED', actual_destroy_date = NOW()
//   UPDATE decomm_schema_registry SET status = 'DESTROYED'
//   INSERT sys_audit_log (operation = 'DESTROY', ...)

// Step 7: 通知管理员
//   发送邮件: "系统 {system_name} 数据已完成物理销毁"
```

### 逻辑五：Unity Catalog 治理集成

```java
// 同步完成后自动配置 UC
// UnityCatalogManager.configureAfterSync(systemCode, schemas)

// Step 1: 创建 UC Schema (如果不存在)
//   CREATE SCHEMA IF NOT EXISTS lake.{system_code}

// Step 2: 注册 Iceberg 表到 UC
//   CREATE TABLE lake.{system_code}.{table_name}
//   USING iceberg
//   LOCATION 'abfss://container@account.dfs.core.windows.net/{system_code}/{table_name}'

// Step 3: 配置 Column Mask (针对 isPii=true 的列)
//   CREATE MASK POLICY mask_full AS (val STRING) RETURNS STRING -> '***';
//   CREATE MASK POLICY mask_first_n AS (val STRING, n INT) RETURNS STRING
//     -> CONCAT(REPEAT('*', LENGTH(val) - n), SUBSTR(val, -n));
//
//   ALTER TABLE lake.{system_code}.{table}
//   ALTER COLUMN customer_name SET MASK mask_full;

// Step 4: 授权 (根据 RBAC 角色-系统映射)
//   GRANT SELECT ON TABLE lake.{system_code}.{table} TO `role_code`;
```

---

## 五、RBAC 权限模型

```
用户 (User) ──N:N──▶ 角色 (Role)
                         │
                    ┌────┼────────────────┐
                    │    │                │
                  N:N   N:N             N:N
                    │    │                │
                    ▼    ▼                ▼
                菜单   权限           退役系统
               (Menu) (Permission)  (ArchiveSystem)
                    │    │                │
                    │    │                │
                    ▼    ▼                ▼
              决定看到   决定能执行     决定能管理
              哪些页面   哪些操作       哪些归档系统

                     ┌───────────────────────┐
                     │   Databricks UC 层     │
                     │   (表级 + 列级脱敏)    │
                     └───────────────────────┘
```

### 预置角色

| 角色 | 编码 | 权限范围 |
|------|------|----------|
| 超级管理员 | `SUPER_ADMIN` | 全部功能 |
| 系统管理员 | `SYSTEM_ADMIN` | 退役系统配置 + 同步管理 |
| 数据操作员 | `DATA_OPERATOR` | 发起同步 + 查询归档数据 |
| 审计员 | `AUDITOR` | 查看审计日志 + 同步记录（只读） |
| 查询用户 | `VIEWER` | 仅查询授权系统的归档数据 |

---

## 六、Databricks 集成详情

### 6.1 Job 类型

| Job | Notebook | 触发时机 | 说明 |
|-----|----------|----------|------|
| 数据同步 | `data_sync_notebook.py` | 管理员手动触发 | JDBC 读取 → Iceberg 写入 ADLS |
| 小文件合并 | `data_compaction.py` | 定时任务 (每周) | 合并小文件提升查询性能 |
| 数据销毁 | `data_destroy_notebook.py` | 到期销毁时 | DROP TABLE + VACUUM |

### 6.2 SQL 查询模式

```java
// DatabricksSqlExecutor.executeQuery(systemCode, tableName, sql, warehouseId)

// 使用 Statement Execution API (异步)
// POST /api/2.0/sql/statements
// {
//   "warehouse_id": warehouseId,
//   "statement": "SELECT * FROM lake.CRM_V1.CUSTOMER_ORDER WHERE ... LIMIT 100",
//   "wait_timeout": "30s",
//   "disposition": "INLINE",
//   "format": "JSON_ARRAY"
// }
//
// → UC 自动应用 Column Mask
// → 返回脱敏后的结果
```

### 6.3 Cluster 配置建议

```json
{
  "cluster_name": "rims-decommission-etl",
  "spark_version": "14.3.x-scala2.12",
  "node_type_id": "Standard_DS4_v2",
  "num_workers": 2,
  "autoscale": { "min_workers": 1, "max_workers": 4 },
  "autotermination_minutes": 10,
  "spark_conf": {
    "spark.databricks.delta.preview.enabled": "true"
  }
}
```

---

## 七、Agent 行为准则

1. **新建文件**: 遵循 README.md 中的目录结构，放在正确位置
2. **修改代码**: 保持与现有代码风格一致 (参考 CLAUDE.md 编码规范)
3. **添加 API**: 同时创建 Controller + Service + Mapper + DTO + 前端 API 文件 + TypeScript 类型
4. **添加页面**: 同时创建 Vue 组件 + 路由配置 + API 文件 + Store（如需要）
5. **数据库变更**: 只能创建新的 Flyway 迁移脚本 (`V3__xxx.sql`)，绝不修改已有脚本
6. **敏感数据**: 永远不在代码中硬编码密码、Token、连接字符串
7. **Schema Registry**: 修改 Schema JSON 结构时，同步更新前端动态组件的解析逻辑
8. **Databricks**: 修改 Notebook 时，同步更新后端 Job 参数组装逻辑
9. **测试**: 关键 Service 方法必须有单元测试
10. **文档**: API 变更时更新 SpringDoc 注解，业务逻辑变更时更新本文件

---

## 八、参考文档

| 文档 | 说明 |
|------|------|
| `README.md` | 项目架构总览、技术栈、业务流程 |
| `CLAUDE.md` | AI 编码规范、架构红线、API 设计 |
| `scripts/sql/` | Flyway 迁移脚本 (完整 DDL + 初始数据) |
| `scripts/databricks/` | Databricks Notebook (同步/合并/销毁) |
| [Databricks Java SDK](https://docs.databricks.com/dev-tools/sdk-java.html) | 官方文档 |
| [Databricks SQL Statement Execution](https://docs.databricks.com/api/sql/) | SQL API |
| [Unity Catalog](https://docs.databricks.com/data-governance/unity-catalog/) | UC 治理文档 |
| [Azure ADLS Gen2](https://learn.microsoft.com/en-us/azure/storage/blobs/) | 存储文档 |
| [Apache Iceberg](https://iceberg.apache.org/docs/latest/) | Iceberg 文档 |
| [Element Plus](https://element-plus.org/) | UI 组件库 |
| [MyBatis-Plus](https://baomidou.com/) | ORM 框架 |
