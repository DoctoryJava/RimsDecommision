# RIMS Decommission — 项目生命周期管理系统

> 企业级系统退役与数据保全平台。当业务系统下线、服务器销毁时，确保历史数据安全迁移与长期归档。

## 📋 项目简介

RIMS Decommission 是一个面向企业的 **系统退役数据保全管理平台**，核心解决的问题是：

- 公司下属的业务系统不再使用，需要下线（Decommission）
- 服务器资源需要销毁释放
- 但系统中的 **历史数据需要长期保存**，满足合规与审计需求

平台提供完整的系统退役流程管理：从系统登记、数据源配置、数据同步到最终归档存储。

## 🏗️ 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                   Frontend (Vue 3 + Element Plus)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  登录页  │ │ 用户角色 │ │ 系统配置 │ │  数据同步监控   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST API (JSON)
┌────────────────────────┴─────────────────────────────────────┐
│                  Backend (Java Spring Boot)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │ Auth     │ │ RBAC     │ │ System       │ │ Data Sync   │ │
│  │ Module   │ │ Module   │ │ Config       │ │ Module      │ │
│  │ (JWT)    │ │ (权限)   │ │ Module       │ │ (Databricks)│ │
│  └──────────┘ └──────────┘ └──────────────┘ └─────────────┘ │
└──┬─────────┬───────────────┬──────────────────┬──────────────┘
   │         │               │                  │
┌──┴──┐  ┌──┴──┐   ┌────────┴────────┐  ┌──────┴───────────┐
│MySQL│  │Redis│   │ Databricks      │  │ Azure Blob       │
│     │  │     │   │ (Java SDK)      │  │ Storage          │
└─────┘  └─────┘   └─────────────────┘  └──────────────────┘
```

## 🧩 核心功能模块

### 1. 认证与授权 (Auth & RBAC)

| 功能 | 说明 |
|------|------|
| 用户登录 | JWT Token 认证，支持记住我、自动刷新 |
| 用户管理 | 用户的增删改查、状态启停 |
| 角色管理 | 角色定义，角色与系统的绑定关系 |
| 菜单/页面管理 | 前端路由与页面的动态配置 |
| 权限管理 | 细粒度的操作权限控制（按钮级别） |
| 角色-系统映射 | 不同角色可访问和管理不同的退役系统 |

### 2. 系统配置 (System Configuration)

登录后，管理员需要对退役系统进行初始化配置：

- **系统基本信息**：系统名称、描述、负责人、所属部门、退役状态
- **数据库配置**：源系统的 DB 连接信息（类型、Host、端口、数据库名、Schema、凭据）
- **存储桶配置**：目标归档存储（Azure Blob Storage 连接字符串、容器名称、存储路径规则）
- **Schema 映射**：源表到目标存储格式的映射关系

### 3. 数据同步 (Data Sync via Databricks)

- 通过 **Databricks Java SDK** 提交数据迁移 Job
- 支持全量同步与增量同步
- 支持多种数据格式导出（Parquet、Delta Lake、CSV）
- 同步任务状态监控与日志查看
- 失败重试与告警通知

### 4. 数据查询与审计

- 归档数据的检索与预览
- 操作审计日志
- 数据完整性校验报告

## 🗄️ 数据库设计（核心表）

```sql
-- ========== 权限管理模块 ==========

-- 用户表
sys_user (
  id, username, password, real_name, email, phone,
  avatar, status, last_login_time, created_at, updated_at
)

-- 角色表
sys_role (
  id, role_name, role_code, description, status,
  created_at, updated_at
)

-- 菜单/页面表
sys_menu (
  id, parent_id, menu_name, menu_type, path, component,
  icon, sort_order, visible, status, created_at, updated_at
)

-- 权限表
sys_permission (
  id, permission_name, permission_code, resource_type,
  description, created_at, updated_at
)

-- 用户-角色关联表
sys_user_role (id, user_id, role_id)

-- 角色-菜单关联表
sys_role_menu (id, role_id, menu_id)

-- 角色-权限关联表
sys_role_permission (id, role_id, permission_id)

-- ========== 退役系统管理模块 ==========

-- 退役系统注册表
decomm_system (
  id, system_name, system_code, description, department,
  owner, status, -- ACTIVE / DECOMMISSIONING / ARCHIVED / DESTROYED
  decommission_date, created_at, updated_at
)

-- 角色-系统映射表（不同角色管理不同系统）
sys_role_system (id, role_id, system_id)

-- 数据库配置表（源系统 DB 信息）
decomm_db_config (
  id, system_id, db_type, -- MYSQL / POSTGRESQL / ORACLE / SQLSERVER
  host, port, database_name, schema_name,
  username, password_encrypted,
  connection_params, test_status, last_test_time,
  created_at, updated_at
)

-- 存储配置表（目标归档存储）
decomm_storage_config (
  id, system_id, storage_type, -- AZURE_BLOB
  connection_string_encrypted, container_name,
  path_prefix, file_format, -- PARQUET / DELTA / CSV
  compression, created_at, updated_at
)

-- Schema 映射表
decomm_schema_mapping (
  id, system_id, source_table, source_columns,
  target_path, target_format, transform_rules,
  created_at, updated_at
)

-- 同步任务表
decomm_sync_job (
  id, system_id, job_type, -- FULL / INCREMENTAL
  databricks_job_id, status, -- PENDING / RUNNING / SUCCESS / FAILED
  start_time, end_time, rows_synced, data_size_bytes,
  error_message, created_by, created_at, updated_at
)

-- 同步日志表
decomm_sync_log (
  id, job_id, log_level, log_message, table_name,
  rows_processed, created_at
)
```

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Vue 3 + TypeScript | 组合式 API |
| **UI 组件库** | Element Plus | 企业级组件 |
| **状态管理** | Pinia | Vue 3 推荐 |
| **路由** | Vue Router 4 | 动态路由 |
| **HTTP** | Axios | 请求封装 |
| **后端** | Java 17 + Spring Boot 3 | 主力框架 |
| **ORM** | MyBatis-Plus | 数据库操作 |
| **认证** | Spring Security + JWT | 认证授权 |
| **缓存** | Redis | Session/Token 缓存 |
| **数据库** | MySQL 8.0 | 主数据库 |
| **大数据引擎** | Databricks (Java SDK) | 数据同步 |
| **对象存储** | Azure Blob Storage | 归档存储 |
| **API 文档** | Swagger / SpringDoc | 接口文档 |
| **构建** | Maven | 后端构建 |
| **构建** | Vite | 前端构建 |
| **容器化** | Docker + Docker Compose | 部署 |

## 🚀 快速开始

### 环境要求

- JDK 17+
- Node.js 18+
- MySQL 8.0+
- Redis 6+
- Maven 3.8+

### 后端启动

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose 一键启动

```bash
docker-compose up -d
```

## 📁 项目结构（规划）

```
RimsDecommision/
├── README.md                 # 项目说明
├── CLAUDE.md                 # AI 编程指南
├── AGENT.md                  # Agent 配置
├── docker-compose.yml        # 容器编排
├── docs/                     # 项目文档
│   ├── api/                  # API 文档
│   ├── architecture/         # 架构设计
│   └── deployment/           # 部署文档
├── backend/                  # Spring Boot 后端
│   ├── src/main/java/
│   │   └── com/rims/decommission/
│   │       ├── config/       # 配置类
│   │       ├── controller/   # 控制器
│   │       ├── service/      # 业务逻辑
│   │       ├── mapper/       # MyBatis Mapper
│   │       ├── entity/       # 实体类
│   │       ├── dto/          # 数据传输对象
│   │       ├── security/     # 安全模块
│   │       ├── databricks/   # Databricks 集成
│   │       └── common/       # 通用工具
│   └── src/main/resources/
│       ├── application.yml
│       ├── mapper/           # MyBatis XML
│       └── db/migration/     # Flyway 数据库迁移
├── frontend/                 # Vue 3 前端
│   ├── src/
│   │   ├── api/              # API 请求
│   │   ├── views/            # 页面组件
│   │   ├── components/       # 通用组件
│   │   ├── store/            # Pinia 状态
│   │   ├── router/           # 路由配置
│   │   ├── utils/            # 工具函数
│   │   ├── layouts/          # 布局组件
│   │   └── assets/           # 静态资源
│   └── public/
└── scripts/                  # 运维脚本
    ├── databricks/           # Databricks 作业脚本
    └── sql/                  # 初始化 SQL
```

## 📄 License

Internal Use Only — 仅限内部使用
