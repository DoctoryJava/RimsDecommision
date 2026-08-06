# Bolt.new 前端工程分析与后端初始化方案

> **来源**：`project-bolt-sb1-pt4jvqwm.zip`（74 KB，44 文件，React 19 + Vite 8 + Tailwind 4）  
> **分析日期**：2026-08-06  **分支**：`arena/019fd5f0-rimsdecommision`

## 一、执行摘要

Bolt.new 生成的是**高保真前端原型**，页面齐全、动效美观、动态查询已打通；短板是无真实 API（全部 mockData）、栈与 RIMS 规范不一致（RIMS 要求 Vue3+Element Plus，Bolt 是 React+Tailwind）、Lakehouse 约束未落地。
**结论**：保留 Bolt 作 Demo 原型，后端按 RIMS 规范（Java17+SpringBoot3.2+MyBatisPlus+MySQL/Flyway+Databricks）全新初始化，通过适配层对接，前端 `types.ts` 映射到 `Result<T>` 即可联调。

## 二、技术栈对照

| 维度 | Bolt 现状 | RIMS 规范 | 处置 |
|------|-----------|-----------|------|
| 框架 | React19 + Vite8 + Tailwind4 | Vue3.4 + TS strict + ElementPlus + Vite5 | 保留原型，生产新建 Vue 版或加 API 适配 |
| 状态 | useState 本地 | Pinia 2 + Vue Router 4 | 需引入 |
| 数据 | mockData/queryData 硬编码，@supabase 未用 | Axios + SpringBoot /api + Databricks SQL | 新增 src/lib/api.ts，删 supabase |
| 构建 | npm + vite | pnpm | 统一 pnpm |

## 三、页面全景（12 页）与 RIMS 映射

| # | Bolt 页面 | 行数 | 核心功能 | 对应 RIMS | 优先级 | 后端 API |
|---|-----------|------|----------|-----------|--------|----------|
|1|Login|162|邮箱密码登录|Auth|P0|POST /api/auth/login|
|2|Dashboard|214|统计卡、Sync Job、存储柱状|仪表盘|P1|GET /api/systems/stats /sync/jobs|
|3|Systems|551|系统CRUD、生命周期stage、DB/Storage配置|decomm_system|P0|GET/POST/PUT/DELETE /api/systems|
|4|DataSync|239|Sync Job 列表、触发同步、Schema展开|decomm_sync_job|P0|GET/POST /api/sync/jobs|
|5|Schemas|167|按系统筛选Schema、表统计|decomm_schema_registry|P0|GET /api/systems/{id}/schemas|
|6|QueryConfigs|562|查询配置CRUD：baseTable、Join可视化、字段映射|Schema Registry|P0|GET/POST /api/systems/{id}/query-configs|
|7|DynamicQuery|371|按 QueryConfig 动态过滤/排序/分页/SQL预览/导出|DynamicQueryBuilder|P0|POST /api/systems/{id}/query|
|8|DbInspector|173|物理表结构+行数据搜索|管理后台|P1|GET /api/systems/{id}/tables/{table}/data|
|9|Users|279|用户CRUD、角色与系统分配|sys_user|P0|GET/POST /api/users|
|10|Roles|275|角色CRUD、权限勾选|sys_role|P0|GET/POST /api/roles|
|11|Permissions|151|权限矩阵|sys_permission|P1|GET /api/permissions|
|12|Pages|131|页面可见性visibleTo、排序|sys_menu|P1|GET /api/menus|
|13|Settings|54|6块占位（Databricks等）|settings|P2|GET /api/settings/*|

## 四、核心数据模型差异

- SystemRecord.stage 4态 vs RIMS 6态（REGISTERED等），需映射
- DbConfig.engine 含 mongodb vs RIMS 白名单无，拒绝
- StorageConfig.provider 通用 vs RIMS ADLS_GEN2，需 minio 模拟
- QueryConfig/FieldMapping/JoinConfig 高度一致 → schema_json.columns
- queryEngine.ts 240行已实现 join/filter/sort/generateSQL，可作后端对照测试

## 五、后端初始化方案（本次执行）

### 目标
backend/ 初始化可编译可启动的 SpringBoot 3.2 最小闭环，让 Bolt 前端通过最小 Mock API 跑通 Login→Systems→DataSync→DynamicQuery

### 选型
Maven + spring-boot-parent 3.2.5 + mybatis-plus 3.5.7 + mysql + flyway + jjwt 0.12.5 + springdoc + lombok + redis

### 目录
```
backend/
├── pom.xml
├── src/main/java/com/rims/decommission/
│   ├── RimsDecommissionApplication.java
│   ├── common/Result.java PageResult.java BusinessException.java GlobalExceptionHandler.java
│   ├── config/MybatisPlusConfig.java SecurityConfig.java WebCorsConfig.java
│   ├── security/JwtTokenProvider.java
│   ├── entity/SysUser.java SysRole.java DecommSystem.java
│   ├── mapper/
│   ├── dto/
│   ├── service/
│   └── controller/AuthController.java SystemController.java QueryController.java
├── src/main/resources/application.yml application-dev.yml
└── src/test/java
```

### 关键契约（首批 4 API）
- POST /api/auth/login → UserRecord
- GET /api/systems → PageResult<SystemRecord>
- GET/POST /api/sync/jobs → SyncJob[]
- POST /api/systems/{id}/query → QueryResult {rows,total,sql}

详见后续 backend/ 代码。
