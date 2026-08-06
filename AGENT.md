# AGENT.md — AI Agent 项目配置

> 本文件为 AI Agent（如 Cursor Agent、GitHub Copilot Agent、Arena Agent 等）提供结构化的项目元数据。

## 项目信息

- **项目名称**: RIMS Decommission（RIMS 系统退役数据保全平台）
- **项目类型**: 企业级 Web 应用（前后端分离）
- **核心目标**: 管理业务系统退役流程，将下线系统的数据安全迁移到 Azure Blob Storage 归档

## 技术栈

### 后端
- **语言**: Java 17
- **框架**: Spring Boot 3.2+
- **ORM**: MyBatis-Plus 3.5+
- **安全**: Spring Security + JWT
- **数据库**: MySQL 8.0
- **缓存**: Redis 6+
- **大数据**: Databricks Java SDK
- **存储**: Azure Blob Storage SDK
- **构建**: Maven
- **迁移**: Flyway

### 前端
- **语言**: TypeScript
- **框架**: Vue 3.4+ (Composition API)
- **UI**: Element Plus 2.x
- **状态**: Pinia 2.x
- **路由**: Vue Router 4
- **HTTP**: Axios
- **构建**: Vite 5.x

## 项目结构

```
RimsDecommision/
├── backend/          → Spring Boot 后端服务
├── frontend/         → Vue 3 前端应用
├── scripts/          → 运维与 Databricks 脚本
├── docs/             → 项目文档
├── docker-compose.yml
├── README.md         → 项目总览与架构说明
├── CLAUDE.md         → AI 编程详细指南（编码规范、业务逻辑）
└── AGENT.md          → 本文件（Agent 结构化配置）
```

## 核心模块

| 模块 | 后端包路径 | 前端目录 | 说明 |
|------|-----------|----------|------|
| 认证 | `security/` | `views/login/` | JWT 登录/登出/Token 刷新 |
| 用户管理 | `controller/UserController` | `views/system/user/` | 用户 CRUD |
| 角色管理 | `controller/RoleController` | `views/system/role/` | 角色 CRUD + 权限/菜单/系统绑定 |
| 菜单管理 | `controller/MenuController` | `views/system/menu/` | 页面/路由动态配置 |
| 权限管理 | `controller/PermissionController` | `views/system/permission/` | 操作权限配置 |
| 退役系统 | `controller/SystemController` | `views/decommission/system-config/` | 退役系统注册与信息 |
| DB 配置 | `controller/DbConfigController` | `views/decommission/db-config/` | 源数据库连接配置 |
| 存储配置 | `controller/StorageConfigController` | `views/decommission/storage-config/` | Azure Blob 目标存储配置 |
| Schema 映射 | `controller/SchemaMappingController` | `views/decommission/schema-mapping/` | 表/字段映射规则 |
| 数据同步 | `controller/SyncJobController` | `views/decommission/sync-monitor/` | Databricks 同步任务管理 |
| 审计日志 | `controller/AuditController` | `views/audit/` | 操作审计 |

## 数据库表清单

### 权限管理
- `sys_user` — 用户表
- `sys_role` — 角色表
- `sys_menu` — 菜单/页面表
- `sys_permission` — 权限表
- `sys_user_role` — 用户-角色关联
- `sys_role_menu` — 角色-菜单关联
- `sys_role_permission` — 角色-权限关联

### 退役管理
- `decomm_system` — 退役系统注册
- `sys_role_system` — 角色-系统映射
- `decomm_db_config` — 源数据库配置
- `decomm_storage_config` — 目标存储配置
- `decomm_schema_mapping` — Schema 映射规则
- `decomm_sync_job` — 同步任务
- `decomm_sync_log` — 同步日志
- `sys_audit_log` — 审计日志

## 关键业务流程

### 1. 用户登录 → 系统初始化
```
Login → JWT Token → 获取用户角色 → 加载系统列表 → 动态路由 → 系统配置引导
```

### 2. 系统退役配置
```
注册系统 → 配置源DB → 测试连接 → 配置目标存储 → 测试连接 → 配置Schema映射
```

### 3. 数据同步
```
发起同步 → 创建Job记录 → Databricks SDK提交Job → 轮询状态 → 更新结果 → 归档完成
```

## 编码约定（Agent 必须遵守）

### 后端
- Controller 只负责参数校验和调用 Service，不写业务逻辑
- Service 接口与实现分离（`XxxService` + `XxxServiceImpl`）
- 统一响应格式：`Result<T>` 包含 `code`、`message`、`data`
- 主键使用雪花算法（`IdType.ASSIGN_ID`）
- 敏感字段（密码、连接字符串）必须 AES 加密存储
- 所有写操作需记录审计日志

### 前端
- 使用 `<script setup lang="ts">` 语法
- API 请求统一放在 `src/api/` 目录，按业务域分文件
- 使用 Pinia 管理状态，Store 命名 `useXxxStore`
- 表单校验使用 Element Plus 的 `el-form` rules
- 组件 Props 必须有 TypeScript 类型定义

## 开发命令

```bash
# 后端
cd backend && mvn spring-boot:run          # 启动后端
cd backend && mvn clean package             # 打包
cd backend && mvn flyway:migrate            # 数据库迁移

# 前端
cd frontend && npm run dev                  # 启动前端开发服务器
cd frontend && npm run build                # 生产构建
cd frontend && npm run lint --fix           # 修复代码风格

# Docker
docker-compose up -d                        # 一键启动全部服务
```

## 环境配置

| 环境 | Profile | 端口 | 说明 |
|------|---------|------|------|
| 开发 | `dev` | 8080 | 本地开发，H2/MySQL |
| 测试 | `test` | 8080 | 测试环境 |
| 生产 | `prod` | 8080 | 生产环境 |

前端开发代理：`/api` → `http://localhost:8080`

## Agent 行为准则

1. **新建文件时**：遵循上述目录结构约定，放在正确的位置
2. **修改代码时**：保持与现有代码风格一致
3. **添加 API 时**：同时创建 Controller + Service + Mapper + DTO + 前端 API 文件
4. **添加页面时**：同时创建 Vue 组件 + 路由配置 + API 文件 + Store（如需要）
5. **数据库变更时**：创建 Flyway 迁移脚本，不要手动修改已有迁移文件
6. **敏感数据**：永远不要在代码中硬编码密码、Token、连接字符串
7. **测试**：为关键 Service 方法编写单元测试
8. **文档**：API 变更时更新 Swagger 注解

## 参考文档

- 详细架构与业务逻辑 → `README.md`
- 编码规范与 API 设计 → `CLAUDE.md`
- Databricks SDK 文档 → https://docs.databricks.com/dev-tools/sdk-java.html
- Azure Blob SDK 文档 → https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-java
- MyBatis-Plus → https://baomidou.com/
- Element Plus → https://element-plus.org/
