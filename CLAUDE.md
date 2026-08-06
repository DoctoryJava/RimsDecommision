# CLAUDE.md — AI 编程指令与编码规范

> **本文件是给 AI 编程助手（Claude Code、Cursor、Copilot Agent）读取的核心配置文件。**
> 在进行代码生成、修改或审查时，**必须严格遵循**以下架构约束与编码规范。

---

## 项目概述

**RIMS Decommission** 是一个企业级系统退役归档平台。当企业内部旧系统（ERP、CRM、OA 等）停止使用、服务器即将销毁时，本系统接管其所有历史数据，通过 **湖仓一体 (Lakehouse)** 架构归档至 Azure ADLS Gen2 (Iceberg 格式)，并提供基于 Schema Registry 的动态查询与安全访问。

---

## 技术栈约束

| 领域 | 技术选型 | 版本 | 备注 |
|------|----------|------|------|
| 后端 | Java + Spring Boot | 17 / 3.2+ | 主力框架 |
| ORM | MyBatis-Plus | 3.5+ | 元数据库操作 |
| 安全 | Spring Security + JWT | — | RBAC 认证授权 |
| 元数据库 | MySQL 8.0 | — | **仅存配置元数据** |
| 缓存 | Redis | 6+ | Token 缓存 |
| 数据库迁移 | Flyway | — | Schema 版本管理 |
| 大数据引擎 | Databricks Java SDK | — | ETL 写入 + SQL 查询 |
| 数据治理 | Unity Catalog (UC) | — | 表权限 + COLUMN MASK 脱敏 |
| 归档存储 | Azure ADLS Gen2 | — | Iceberg 格式 |
| 附件存储 | Azure Blob Storage | — | 非结构化文件 |
| 密钥管理 | Azure Key Vault | — | 凭据加解密 |
| API 文档 | SpringDoc OpenAPI | 2.x | Swagger |
| 前端框架 | Vue 3 + TypeScript | 3.4+ | Composition API |
| UI | Element Plus | 2.x | 企业级组件 |
| 状态 | Pinia | 2.x | — |
| 路由 | Vue Router | 4.x | 动态路由 |
| HTTP | Axios | 1.x | 统一封装 |
| 构建 | Vite | 5.x | — |
| 包管理 | pnpm | 8+ | — |

---

## ⚠️ 核心架构红线（绝对不可违反）

### 红线 1：元数据与真实数据分离

```
元数据库 (MySQL)               数据湖 (ADLS Gen2 + Iceberg)
┌──────────────────┐           ┌──────────────────────────┐
│ • 系统配置       │           │ • 所有退役系统的业务数据  │
│ • Schema Registry│           │ • Iceberg 表格式          │
│ • RBAC 权限      │           │ • Unity Catalog 治理      │
│ • 销毁策略       │           │ • 支持 Time Travel        │
│ • 审计日志       │           │                          │
└──────────────────┘           └──────────────────────────┘
```

- **元数据库** 仅存：系统配置、Schema 描述、RBAC、销毁策略、审计日志
- **绝不在元数据库中存储或查询归档的业务数据**
- 所有归档数据的查询必须通过 **Databricks SQL (Statement Execution API)** 执行
- 所有归档数据的写入必须通过 **Databricks Jobs** 执行

### 红线 2：安全凭据零明文

- DB 连接串、Storage Access Key、Databricks Token **严禁明文存储**
- 生产环境必须通过 **Azure Key Vault** 获取密钥
- 开发环境可用本地环境变量或 AES 加密的配置文件
- Databricks 端使用 **Secret Scope** 引用密钥

### 红线 3：敏感字段脱敏走 Unity Catalog

- **严禁在前端 JS/TS 中硬编码脱敏逻辑**
- **严禁在后端 Java 中手动脱敏**
- 字段脱敏统一在 **Unity Catalog** 中配置 COLUMN MASK 策略
- 查询时由 Databricks SQL 引擎自动应用脱敏规则
- 后端只需确保查询用户具有正确的 UC 权限

### 红线 4：附件访问必须经过 SAS 令牌

- 前端**绝不直接持有** Azure Storage 的 Access Key
- 附件预览/下载流程：前端请求 → 后端校验权限 → 签发 SAS URL（有效期 ≤ 15 分钟） → 前端直接使用 SAS URL 访问

### 红线 5：归档数据 1:1 原样入湖

- 源系统的表结构必须 **1:1 映射**到 Iceberg 表
- 不做字段合并、不做跨表 JOIN 宽表
- 保留原始字段名、类型、精度
- 通过 Schema Registry 的 `alias` 字段提供中文显示名

---

## 开发命令速查

### 后端 (.NET → Java Spring Boot)

```bash
cd backend
mvn clean package -DskipTests         # 构建
mvn spring-boot:run                   # 运行 (dev profile)
mvn spring-boot:run -Dspring-boot.run.profiles=test  # 测试环境
mvn test                              # 单元测试
mvn flyway:migrate                    # 数据库迁移
mvn flyway:info                       # 查看迁移状态
```

### 前端

```bash
cd frontend
pnpm install                          # 安装依赖
pnpm dev                              # 本地开发 (http://localhost:5173)
pnpm build                            # 生产构建
pnpm lint                             # ESLint 检查
pnpm lint --fix                       # 自动修复
pnpm type-check                       # TypeScript 类型检查
```

### Docker

```bash
docker-compose up -d mysql redis      # 启动基础设施
docker-compose down -v                # 清除所有容器和数据
```

---

## 后端编码规范 (Java / Spring Boot)

### 1. 分层架构

```
Controller → Service(Interface) → ServiceImpl → Mapper → MySQL
                                       │
                                       ├──→ DatabricksJobManager → Databricks Jobs
                                       ├──→ DatabricksSqlExecutor → Databricks SQL
                                       ├──→ UnityCatalogManager → UC API
                                       ├──→ AdlsService → ADLS Gen2
                                       ├──→ BlobSasService → Azure Blob SAS
                                       └──→ KeyVaultService → Azure Key Vault
```

### 2. Controller 层

- **只做**参数校验 (`@Valid`)、权限检查 (`@PreAuthorize`)、调用 Service、返回 `Result<T>`
- **不写**任何业务逻辑
- 统一使用 `@RestController` + `@RequestMapping("/api/xxx")`
- RESTful 设计：`GET`=查询, `POST`=创建, `PUT`=更新, `DELETE`=删除

### 3. Service 层

- 接口与实现分离：`XxxService` (interface) + `XxxServiceImpl` (@Service)
- `@Transactional` 放在 **实现类** 方法上，只读方法标注 `readOnly = true`
- 复杂业务逻辑必须有 JavaDoc 注释说明

### 4. Entity 层

- 使用 MyBatis-Plus 注解：`@TableName`, `@TableId(type = IdType.ASSIGN_ID)`, `@TableField`
- 主键 `Long` 类型，雪花算法生成
- `createdAt` / `updatedAt` 使用 `MetaObjectHandler` 自动填充
- 逻辑删除字段使用 `@TableLogic`
- 敏感字段（密码、连接串）使用 `@JsonIgnore` 防止序列化

### 5. 统一响应格式

```java
public class Result<T> {
    private int code;         // 200=成功, 401=未认证, 403=无权限, 500=服务器错误
    private String message;   // 提示信息
    private T data;           // 业务数据
    private long timestamp;   // 时间戳 (System.currentTimeMillis())
}

// 分页响应
public class PageResult<T> {
    private long total;       // 总记录数
    private List<T> list;     // 当前页数据
    private int pageNum;      // 当前页码
    private int pageSize;     // 每页条数
}
```

### 6. 异常处理

```java
// 自定义业务异常
public class BusinessException extends RuntimeException {
    private int code;
    private String message;
}

// 全局异常处理器
@RestControllerAdvice
public class GlobalExceptionHandler {
    // BusinessException → 业务错误码
    // MethodArgumentNotValidException → 参数校验失败
    // AccessDeniedException → 403
    // Exception → 500 兜底
}
```

### 7. Databricks 集成规范

```java
// Job 提交：使用 Databricks Java SDK
public class DatabricksJobManager {
    // 提交同步任务 → 返回 runId
    // 轮询任务状态 → RUNNING/SUCCESS/FAILED
    // 获取任务输出 → JSON 结果
}

// 数据查询：使用 Statement Execution API
public class DatabricksSqlExecutor {
    // 执行 SQL → 返回 ResultSet
    // 自动走 Unity Catalog 鉴权 + Column Mask 脱敏
    // 查询超时限制 30s
    // 结果集最大 10000 行
}

// UC 管理：表注册 + 权限 + 脱敏
public class UnityCatalogManager {
    // 注册 Iceberg 表到 UC catalog
    // 配置 Column Mask 策略
    // 授权角色访问指定表
}
```

### 8. Schema Registry 查询引擎

```java
// 根据 Schema Registry JSON + 用户查询条件 → 动态生成 SQL
public class DynamicQueryBuilder {
    // 输入: Schema JSON + QueryParams (字段名, 操作符, 值)
    // 输出: SELECT col1, col2 FROM lake.{system_code}.{table} WHERE ...
    // 安全: 白名单校验字段名 (只允许 Schema 中定义的列)
    // 安全: SQL 参数化防注入
    // 安全: 自动添加 LIMIT (默认 100, 最大 10000)
}
```

---

## 前端编码规范 (Vue 3 + TypeScript)

### 1. 组件规范

```vue
<script setup lang="ts">
// ✅ 使用 Composition API + TypeScript
import { ref, computed, onMounted } from 'vue'
import type { ArchiveSystem, SchemaRegistry } from '@/types'

// Props 必须有类型定义
const props = defineProps<{
  systemId: number
  readonly?: boolean
}>()

// Emits 必须有类型声明
const emit = defineEmits<{
  save: [data: ArchiveSystem]
  cancel: []
}>()
</script>
```

### 2. 动态渲染组件（核心）

```
src/components/dynamic/
├── DynamicFilterForm.vue   # 根据 Schema Registry → 渲染查询表单
│                           # queryType=equal → el-input
│                           # queryType=range → 两个 el-input-number
│                           # queryType=date-range → el-date-picker range
│                           # queryType=like → el-input (模糊搜索)
│                           # queryType=select → el-select
│
├── DynamicDataTable.vue    # 根据 Schema Registry → 渲染数据表格
│                           # 列顺序、列宽、列标题 全部由 Schema 驱动
│                           # isPii=true 的列由 UC 自动脱敏，前端无需处理
│                           # isAttachment=true → 渲染预览/下载按钮
│
└── DynamicColumn.vue       # 单列渲染器
                            # 根据 type 选择格式化方式
                            # DATE → dayjs 格式化
                            # DECIMAL → 千分位 + 小数位
                            # ATTACHMENT → SAS 预览链接
```

### 3. API 请求规范

```typescript
// src/api/system.ts — 每个业务域一个文件
import request from '@/utils/request'
import type { ArchiveSystem, SchemaRegistry, SyncJob } from '@/types'

// 退役系统
export const getSystems = (params?: PageQuery) =>
  request.get<Result<PageResult<ArchiveSystem>>>('/api/systems', { params })

export const createSystem = (data: CreateSystemRequest) =>
  request.post<Result<ArchiveSystem>>('/api/systems', data)

// Schema Registry
export const getSchemaRegistry = (systemId: number) =>
  request.get<Result<SchemaRegistry[]>>(`/api/systems/${systemId}/schemas`)

// 数据查询 (动态)
export const queryArchiveData = (systemId: number, params: DynamicQueryParams) =>
  request.post<Result<PageResult<Record<string, any>>>>(
    `/api/systems/${systemId}/query`, params
  )

// 附件 SAS
export const getAttachmentSasUrl = (systemId: number, objectKey: string) =>
  request.get<Result<{ sasUrl: string }>>(
    `/api/systems/${systemId}/attachments/sas`, { params: { objectKey } }
  )
```

### 4. 状态管理 (Pinia)

```typescript
// Store 命名: useXxxStore
// useUserStore    → 登录状态、用户信息、角色、Token
// usePermissionStore → 菜单、动态路由、按钮权限
// useSystemStore  → 当前选中的退役系统
// useAppStore     → 全局配置、侧边栏状态、主题
```

### 5. 路由与权限

```
静态路由 (router/routes.ts):
  /login         → 登录页
  /403           → 无权限
  /404           → 页面不存在
  /dashboard     → 仪表盘

动态路由 (登录后从 API 加载):
  /system/*      → 系统管理 (RBAC)
  /decommission/* → 退役管理
  /audit/*       → 审计中心

路由守卫 (router/guard.ts):
  1. 检查 Token 是否存在
  2. 获取用户信息 + 角色
  3. 加载菜单 → 生成动态路由
  4. 校验目标路由权限
```

### 6. TypeScript 严格模式

- `tsconfig.json` 开启 `"strict": true`
- **禁止使用 `any`**，必须定义具体类型
- 所有 API 请求/响应类型定义在 `src/types/` 目录
- 组件 Props 必须使用泛型 `defineProps<T>()`

---

## API 设计规范

### 通用约定

| 项目 | 约定 |
|------|------|
| 基础路径 | `/api` |
| 认证 | `Authorization: Bearer {jwt_token}` |
| Content-Type | `application/json` |
| 分页请求 | `?pageNum=1&pageSize=20` |
| 分页响应 | `{ total, list, pageNum, pageSize }` |
| 时间格式 | ISO 8601 (`2026-08-06T10:00:00+08:00`) |

### 核心 API 端点

```
# ──── 认证 ────
POST   /api/auth/login                          # 登录
POST   /api/auth/logout                         # 登出
GET    /api/auth/user-info                      # 当前用户信息+角色+菜单
POST   /api/auth/refresh-token                  # 刷新 Token

# ──── 用户管理 ────
GET    /api/users                               # 用户列表
POST   /api/users                               # 创建用户
PUT    /api/users/{id}                          # 更新用户
DELETE /api/users/{id}                          # 删除用户

# ──── 角色管理 ────
GET    /api/roles                               # 角色列表
POST   /api/roles                               # 创建角色
PUT    /api/roles/{id}                          # 更新角色
DELETE /api/roles/{id}                          # 删除角色
PUT    /api/roles/{id}/systems                  # 角色绑定退役系统
PUT    /api/roles/{id}/menus                    # 角色绑定菜单
PUT    /api/roles/{id}/permissions              # 角色绑定权限

# ──── 菜单 ────
GET    /api/menus                               # 完整菜单树
GET    /api/menus/user                          # 当前用户菜单(动态路由)

# ──── 退役系统 ────
GET    /api/systems                             # 退役系统列表
POST   /api/systems                             # 注册退役系统
PUT    /api/systems/{id}                        # 更新系统信息
DELETE /api/systems/{id}                        # 删除系统
GET    /api/systems/{id}/status                 # 系统状态 (含同步进度)

# ──── 系统初始化配置 ────
GET    /api/systems/{id}/db-config              # 获取 DB 配置
POST   /api/systems/{id}/db-config              # 保存 DB 配置
POST   /api/systems/{id}/db-config/test         # 测试 DB 连接
GET    /api/systems/{id}/storage-config         # 获取存储配置
POST   /api/systems/{id}/storage-config         # 保存存储配置
POST   /api/systems/{id}/storage-config/test    # 测试存储连接

# ──── Schema Registry (核心!) ────
GET    /api/systems/{id}/schemas                # 获取 Schema 列表
POST   /api/systems/{id}/schemas/discover       # 自动探测源表结构
POST   /api/systems/{id}/schemas                # 保存 Schema Registry
PUT    /api/systems/{id}/schemas/{schemaId}     # 更新单个 Schema
DELETE /api/systems/{id}/schemas/{schemaId}     # 删除 Schema

# ──── 数据同步 ────
POST   /api/sync/jobs                           # 创建同步任务
GET    /api/sync/jobs                           # 同步任务列表
GET    /api/sync/jobs/{id}                      # 任务详情
POST   /api/sync/jobs/{id}/cancel               # 取消任务
GET    /api/sync/jobs/{id}/logs                 # 任务日志

# ──── 归档数据查询 (动态, 走 Databricks SQL) ────
POST   /api/systems/{id}/query                  # 动态查询归档数据
GET    /api/systems/{id}/tables                 # 获取可查询的表列表
GET    /api/systems/{id}/tables/{table}/count   # 表行数统计

# ──── 附件访问 ────
GET    /api/systems/{id}/attachments/sas        # 签发 SAS URL (≤15min)

# ──── 生命周期管理 ────
GET    /api/lifecycle/policies                  # 生命周期策略列表
POST   /api/lifecycle/policies                  # 创建销毁策略
GET    /api/lifecycle/expiring                  # 即将到期系统列表
POST   /api/lifecycle/destroy/{systemId}        # 触发数据销毁

# ──── 审计日志 ────
GET    /api/audit/logs                          # 审计日志列表
GET    /api/audit/logs/export                   # 导出审计日志
```

---

## 开发注意事项

1. **大数据量**：退役系统数据量可能达 TB 级，Databricks Job 必须支持分片并行
2. **幂等性**：同步任务必须支持幂等重试 (Iceberg `MERGE INTO` 或 `OVERWRITE`)
3. **成本控制**：Databricks Cluster 使用 `auto-terminate` (空闲 10min 自动关闭)
4. **查询限制**：Databricks SQL 查询默认 LIMIT 100，最大 10000，禁止全表扫描
5. **审计日志**：所有写操作 (CREATE/UPDATE/DELETE) 必须记录审计日志
6. **国际化**：前端支持 i18n (中/英)，Schema Registry 的 `alias` 字段存储中文
7. **环境隔离**：Spring Profile 区分 `dev` / `test` / `prod`
8. **数据库变更**：只能通过 Flyway 迁移脚本修改数据库，禁止手动 ALTER
