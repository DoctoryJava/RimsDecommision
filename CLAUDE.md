# CLAUDE.md — AI 编程指南

> 本文件为 AI 编程助手（Claude、Cursor、Copilot 等）提供项目上下文与编码规范。
> 在进行代码生成、修改或审查时，请严格遵循以下约定。

## 项目概述

**RIMS Decommission** 是一个企业级系统退役数据保全平台。当公司的业务系统需要下线时，通过本平台将源系统的数据迁移到 Azure Blob Storage 进行长期归档，数据同步引擎使用 Databricks。

## 技术栈速查

| 领域 | 技术选型 | 版本 |
|------|----------|------|
| 前端框架 | Vue 3 (Composition API) + TypeScript | 3.4+ |
| UI 组件库 | Element Plus | 2.x |
| 状态管理 | Pinia | 2.x |
| 构建工具 | Vite | 5.x |
| 后端框架 | Java + Spring Boot | 17 / 3.2+ |
| ORM | MyBatis-Plus | 3.5+ |
| 认证框架 | Spring Security + JWT | - |
| 数据库 | MySQL 8.0 | - |
| 缓存 | Redis | 6+ |
| 大数据引擎 | Databricks Java SDK | - |
| 对象存储 | Azure Blob Storage (azure-storage-blob SDK) | - |
| API 文档 | SpringDoc OpenAPI | 2.x |
| 数据库迁移 | Flyway | - |

## 项目结构约定

### 后端 (`backend/`)

```
src/main/java/com/rims/decommission/
├── config/              # Spring 配置类
│   ├── SecurityConfig.java
│   ├── RedisConfig.java
│   ├── DatabricksConfig.java
│   ├── AzureStorageConfig.java
│   └── CorsConfig.java
├── controller/          # REST 控制器（仅做参数校验和转发）
├── service/             # 业务逻辑层
│   ├── impl/            # Service 实现类
│   └── interfaces/      # Service 接口
├── mapper/              # MyBatis-Plus Mapper 接口
├── entity/              # 数据库实体（对应表结构）
├── dto/                 # 数据传输对象（请求/响应）
│   ├── request/         # 请求 DTO
│   └── response/        # 响应 DTO
├── vo/                  # 视图对象（前端展示用）
├── enums/               # 枚举类
├── security/            # 安全相关
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   └── UserDetailsServiceImpl.java
├── databricks/          # Databricks 集成
│   ├── DatabricksClient.java
│   ├── DatabricksJobManager.java
│   └── jobs/            # Databricks Job 定义
├── storage/             # Azure Blob Storage 集成
│   ├── AzureBlobService.java
│   └── StoragePathResolver.java
├── common/              # 通用模块
│   ├── result/          # 统一响应封装
│   ├── exception/       # 异常处理
│   ├── annotation/      # 自定义注解
│   ├── aspect/          # AOP 切面
│   └── util/            # 工具类
└── RimsDecommissionApplication.java
```

### 前端 (`frontend/`)

```
src/
├── api/                 # API 请求模块（按业务域拆分）
│   ├── auth.ts
│   ├── user.ts
│   ├── role.ts
│   ├── system.ts
│   └── sync.ts
├── views/               # 页面视图（与路由一一对应）
│   ├── login/
│   ├── dashboard/
│   ├── system/
│   │   ├── user/
│   │   ├── role/
│   │   ├── menu/
│   │   └── permission/
│   ├── decommission/
│   │   ├── system-config/
│   │   ├── db-config/
│   │   ├── storage-config/
│   │   └── sync-monitor/
│   └── audit/
├── components/          # 可复用组件
├── composables/         # 组合式函数 (useXxx)
├── store/               # Pinia 状态仓库
│   ├── useUserStore.ts
│   ├── usePermissionStore.ts
│   └── useAppStore.ts
├── router/              # 路由配置
│   ├── index.ts
│   ├── routes.ts
│   └── guard.ts         # 路由守卫
├── layouts/             # 布局组件
├── utils/               # 工具函数
│   ├── request.ts       # Axios 封装
│   ├── auth.ts          # Token 管理
│   └── validate.ts      # 表单校验
├── types/               # TypeScript 类型定义
├── assets/              # 静态资源
├── styles/              # 全局样式
├── App.vue
└── main.ts
```

## 编码规范

### 后端 Java 规范

1. **命名规范**
   - 包名全小写：`com.rims.decommission`
   - 类名大驼峰：`SystemConfigService`
   - 方法名小驼峰：`getSystemById()`
   - 常量全大写：`MAX_RETRY_COUNT`
   - 数据库字段下划线：`created_at` → 实体 `createdAt`

2. **Controller 层**
   - 只做参数校验和转发，不写业务逻辑
   - 统一使用 `@RestController` + `@RequestMapping`
   - 返回值统一使用 `Result<T>` 封装
   - RESTful API 设计：GET 查询、POST 创建、PUT 更新、DELETE 删除

3. **Service 层**
   - 接口 + 实现类分离
   - 事务注解 `@Transactional` 放在 Service 实现类上
   - 复杂业务逻辑需要有注释说明

4. **Entity 层**
   - 使用 MyBatis-Plus 注解 `@TableName`、`@TableId`、`@TableField`
   - 主键使用 `Long` 类型，策略为 `IdType.ASSIGN_ID`（雪花算法）
   - 创建时间、更新时间使用自动填充

5. **异常处理**
   - 自定义业务异常 `BusinessException`
   - 全局异常处理器 `GlobalExceptionHandler`
   - 不要在 Controller 中 try-catch

6. **统一响应格式**
```java
public class Result<T> {
    private int code;        // 200 成功, 其他为错误码
    private String message;  // 提示信息
    private T data;          // 业务数据
    private long timestamp;  // 时间戳
}
```

7. **数据库配置安全**
   - 密码等敏感信息使用加密存储（AES）
   - 连接测试通过后才允许保存
   - 使用 `@JsonIgnore` 避免密码字段在 API 响应中暴露

### 前端 Vue 3 规范

1. **组件规范**
   - 使用 `<script setup lang="ts">` 语法
   - 组件文件使用大驼峰命名：`SystemConfigForm.vue`
   - Props 使用 `defineProps` + TypeScript 类型
   - Emits 使用 `defineEmits` + 类型声明

2. **API 请求**
   - 每个业务域一个 API 文件
   - 使用 TypeScript 定义请求/响应类型
   - 统一使用 Axios 封装的 `request` 实例

3. **状态管理**
   - 使用 Pinia，每个 Store 一个文件
   - Store 命名：`useXxxStore`
   - 登录状态、权限信息放在 `useUserStore`
   - 动态路由/菜单放在 `usePermissionStore`

4. **路由与权限**
   - 静态路由：登录页、404 等
   - 动态路由：登录后根据用户角色动态生成
   - 路由守卫：检查 Token、加载用户信息、生成动态路由

5. **表单校验**
   - 使用 Element Plus 内置的 `el-form` 校验规则
   - 复杂校验逻辑抽取到 `utils/validate.ts`

## 核心业务逻辑

### 登录后系统初始化流程

```
用户登录成功
    │
    ├── 1. 获取用户信息与角色
    │       GET /api/auth/user-info
    │
    ├── 2. 根据角色加载可访问的系统列表
    │       GET /api/systems?role={roleId}
    │
    ├── 3. 动态生成菜单/路由
    │       GET /api/menus?role={roleId}
    │
    └── 4. 进入系统配置页面（首次使用引导）
            ├── 填写系统基本信息
            ├── 配置源数据库连接 (DB Config)
            │       └── 测试连接 → 通过后保存
            ├── 配置目标存储 (Storage Config)
            │       └── 测试连接 → 通过后保存
            └── 配置 Schema 映射
                    └── 选择表 → 映射字段 → 保存
```

### Databricks 数据同步流程

```
管理员发起同步任务
    │
    ├── 1. 创建同步任务记录 (decomm_sync_job)
    │       status = PENDING
    │
    ├── 2. 生成 Databricks Job 配置
    │       ├── 读取源 DB 配置
    │       ├── 读取目标存储配置
    │       └── 读取 Schema 映射
    │
    ├── 3. 通过 Databricks Java SDK 提交 Job
    │       ├── 创建 Cluster 配置
    │       ├── 配置 Notebook / JAR 任务
    │       └── 提交并获取 job_id
    │
    ├── 4. 轮询/回调监控任务状态
    │       ├── RUNNING → 记录日志
    │       ├── SUCCESS → 更新统计信息
    │       └── FAILED → 记录错误，触发告警
    │
    └── 5. 完成后更新系统退役状态
```

### RBAC 权限模型

```
用户 (User)
  └── 多对多 ──→ 角色 (Role)
                    ├── 多对多 ──→ 菜单 (Menu)       // 决定看到哪些页面
                    ├── 多对多 ──→ 权限 (Permission)  // 决定能执行哪些操作
                    └── 多对多 ──→ 系统 (System)      // 决定能管理哪些退役系统
```

## API 设计规范

### 通用约定

- 基础路径：`/api`
- 认证方式：`Authorization: Bearer {token}`
- 分页参数：`pageNum`（页码，从1开始）、`pageSize`（每页条数）
- 分页响应：`{ total, list, pageNum, pageSize }`

### 核心 API 端点

```
POST   /api/auth/login              # 登录
POST   /api/auth/logout             # 登出
GET    /api/auth/user-info          # 获取当前用户信息
POST   /api/auth/refresh-token      # 刷新 Token

GET    /api/users                   # 用户列表
POST   /api/users                   # 创建用户
PUT    /api/users/{id}              # 更新用户
DELETE /api/users/{id}              # 删除用户

GET    /api/roles                   # 角色列表
POST   /api/roles                   # 创建角色
PUT    /api/roles/{id}              # 更新角色
DELETE /api/roles/{id}              # 删除角色
PUT    /api/roles/{id}/systems      # 角色绑定系统
PUT    /api/roles/{id}/menus        # 角色绑定菜单
PUT    /api/roles/{id}/permissions  # 角色绑定权限

GET    /api/menus                   # 菜单树
GET    /api/menus/user              # 当前用户菜单（动态路由用）

GET    /api/systems                 # 退役系统列表
POST   /api/systems                 # 注册退役系统
PUT    /api/systems/{id}            # 更新系统信息
DELETE /api/systems/{id}            # 删除系统

GET    /api/systems/{id}/db-config           # 获取 DB 配置
POST   /api/systems/{id}/db-config           # 保存 DB 配置
POST   /api/systems/{id}/db-config/test      # 测试 DB 连接

GET    /api/systems/{id}/storage-config      # 获取存储配置
POST   /api/systems/{id}/storage-config      # 保存存储配置
POST   /api/systems/{id}/storage-config/test # 测试存储连接

GET    /api/systems/{id}/schema-mappings     # 获取 Schema 映射
POST   /api/systems/{id}/schema-mappings     # 保存 Schema 映射

POST   /api/sync/jobs                        # 创建同步任务
GET    /api/sync/jobs                        # 同步任务列表
GET    /api/sync/jobs/{id}                   # 任务详情
POST   /api/sync/jobs/{id}/cancel            # 取消任务
GET    /api/sync/jobs/{id}/logs              # 任务日志
```

## 开发注意事项

1. **敏感信息**：数据库密码、Azure 连接字符串等必须加密存储，使用 AES 加密
2. **Databricks Job**：提交的 Job 需要指定合适的 Cluster 配置，注意成本控制
3. **数据量**：退役系统的数据量可能非常大（TB 级别），同步任务需要支持分片
4. **幂等性**：同步任务需要支持幂等重试，避免数据重复
5. **审计日志**：所有配置变更操作都需要记录审计日志
6. **国际化**：前端支持中英文切换（i18n）
7. **环境配置**：使用 Spring Profile 区分 dev/test/prod 环境

## 常用开发命令

```bash
# 后端
cd backend
mvn clean package -DskipTests     # 打包
mvn spring-boot:run               # 启动
mvn flyway:migrate                # 数据库迁移

# 前端
cd frontend
npm run dev                       # 开发模式
npm run build                     # 生产构建
npm run lint                      # 代码检查
npm run type-check                # 类型检查
```
