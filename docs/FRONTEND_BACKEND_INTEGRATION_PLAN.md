# 前后端联调实施计划 — Bolt 前端展示数据与交互 × 后端接口

> **状态**：`PLAN`（未开始编码，需你确认后按 Phase 逐个实现）  
> **日期**：2026-08-06  **分支**：`arena/019fd5f0-rimsdecommision`  
> **基线**：`frontend/`（Bolt React 12 页） + `backend/`（Spring Boot 最小闭环，4 个 Mock API 已就绪） + `docs/BOLT_FRONTEND_ANALYSIS.md`  
> **目标**：将前端 `mockData.ts` / `queryData.ts` / `queryEngine.ts` 的**展示数据与交互**逐页替换为**真实后端 `/api` 调用**（`Result<T>` / `PageResult<T>`），保持 UI 不变  
> **原则**：一次一页、可演示、可回滚；先 P0 核心链路，再 P1 治理

---

## 一、前端数据与交互全量清单（按页面）

| 页面 | 展示数据（读） | 交互（写） | 当前数据源 | 关键交互细节 |
|------|----------------|------------|------------|--------------|
| **Login** | 邮箱/密码表单、错误提示、Brand 插画 | 提交登录 → `setLoggedIn(true)` | `useState` 硬编码 `sarah.chen@company.com/demo1234` + `setTimeout 800ms` | 无校验、无 JWT、无错误码 |
| **Dashboard** | 4 卡统计（active/deprecated/archived/totalDataGB）、最近 5 Job 列表、存储柱状（COP/HRP…）、周活趋势（syncActivityData） | 卡片点击 `onNavigate(page)` | `mockData.systems` / `syncJobs` / `storageUsageData` 内存聚合 | 统计为前端 `filter/reduce` 实时算 |
| **Systems** | 系统列表（卡片/表）、搜索、stage 筛选、详情抽屉（DB/Storage 配置、tags、archivedAt）、分页 | 新增/编辑/删除系统、切换 stage、配置 DB/Storage、归档/销毁 | `systems` 数组 `useState` | 551 行，含 `stageMap`、`DbConfig`/`StorageConfig` 抽屉表单 |
| **DataSync** | Job 列表（type/status/duration/records/trigerBy）、Schema 折叠（tables/columns/size）、进度徽 | 触发同步 Modal（选系统+类型）、取消 | `syncJobs` / `schemas` | 状态 `syncing` 无轮询 |
| **Schemas** | Schema 卡（systemFilter+search）、表统计（columns/rows/sizeMB/archived）、总计 | 展开/折叠、筛选 | `schemas` | 前端 `filter` |
| **QueryConfigs** | 配置列表（baseTable/joins/fields/status）、搜索、字段展开、Join 关系图 | 新建/编辑配置（选 baseTable、加 Join、可视化字段 alias/render/visible/filterable）、删除、预览 SQL | `initialQueryConfigs` / `physicalTables` | 562 行最复杂，含 `FieldMapping` 11 字段 |
| **DynamicQuery** | 按 `QueryConfig` 动态渲染过滤器（11 操作符 `eq/like/between...`）、表头（alias/label/render）、分页、排序、SQL 预览 | 加过滤条件、切操作符、输值、执行查询、重置、导出、显隐列 | `queryEngine.executeQuery` 内存 `join/filter/sort/page` | 371 行，核心演示页，前端 `generateSQL` 仅展示 |
| **DbInspector** | 左表列表 + 右表结构（FieldType 图标）+ 行数据 + 搜索 | 切表、搜索行 | `physicalTables` | 管理后台，需鉴权 |
| **Users** | 用户列表（avatar/role/systemIds/status/lastLogin）、搜索、角色色点 | 新增/编辑（选角色+系统）、删除、禁用 | `users` / `roles` / `systems` | `systemIds` 多选 |
| **Roles** | 双 Tab（admin/tenant）、角色卡、权限勾选、颜色、内置标识 | 新建/编辑角色、改权限、删角色 | `roles` / `permissions` | `permissions` 按 `category` 过滤 |
| **Permissions** | 权限矩阵（code/module/action/category） | 筛选、查看 | `permissions` | 只读 |
| **Pages** | 页面列表（path/module/icon/order/enabled/visibleTo） | 加页、显隐、上下移、拖拽 | `pages` | `visibleTo: RoleKey[]` |
| **Settings** | 6 占位卡（Databricks/DB/Storage/Security/Notifications/API） | Configure 按钮 | 静态 `sections` | 无 |

---

## 二、后端接口清单（按页面一一对应）

> 统一契约：`Result<T>` `{code,message,data,timestamp}`；分页 `PageResult<T>` `{total,list,pageNum,pageSize}`；鉴权 `Authorization: Bearer {jwt}`；错误 `BusinessException → Result.fail`。

| 页面 | 读接口（展示数据） | 写接口（交互） | DTO / Entity | 备注 |
|------|---------------------|----------------|--------------|------|
| **Login** | — | `POST /api/auth/login {username,password}` → `{token,user}`<br>`GET /api/auth/user-info` → `{user,roles,permissions,menus}`<br>`POST /api/auth/logout` | `LoginRequest/Response` ↔ `SysUser` | 已 Mock，需接 `JwtTokenProvider` + `UserDetailsService` + Redis |
| **Dashboard** | `GET /api/systems/stats` → `{active,deprecated,archived,totalDataGB}`<br>`GET /api/sync/jobs?limit=5` → `SyncJob[]`<br>`GET /api/storage/usage` → `{system,gb}[]`<br>`GET /api/sync/activity?days=7` → `{day,success,failed}[]` | — | 聚合 `decomm_system` + `decomm_sync_job` | 可直接 `COUNT`/`SUM`，无需新表 |
| **Systems** | `GET /api/systems?pageNum=&pageSize=&search=&stage=` → `PageResult<SystemRecord>`<br>`GET /api/systems/{id}` | `POST /api/systems` / `PUT /api/systems/{id}` / `DELETE /api/systems/{id}`<br>`PUT /api/systems/{id}/stage {stage}`<br>`GET/PUT /api/systems/{id}/db-config` + `POST /test`<br>`GET/PUT /api/systems/{id}/storage-config` + `POST /test` | `SystemCreateRequest` ↔ `DecommSystem` + `DecommDbConfig` + `DecommStorageConfig` | `stage` 需映射 4态↔6态 |
| **DataSync** | `GET /api/sync/jobs?pageNum=&status=` → `PageResult<SyncJob>`<br>`GET /api/schemas?systemId=` → `SchemaRecord[]` | `POST /api/sync/jobs {systemId,type}` → `SyncJob`<br>`POST /api/sync/jobs/{id}/cancel`<br>`GET /api/sync/jobs/{id}/logs` | `SyncJobCreateRequest` ↔ `DecommSyncJob` | 需 `DatabricksJobManager` 轮询（初期 Mock `syncing→success` 定时） |
| **Schemas** | `GET /api/schemas?systemId=&search=` → `SchemaRecord[]`（含 `tables{columns,rows,sizeMB,archived}`） | — | `DecommSchemaRegistry` | `schemas` 即 `decomm_schema_registry` 按 `systemId` 聚合 |
| **QueryConfigs** | `GET /api/query-configs?search=` → `QueryConfig[]`<br>`GET /api/tables` → `PhysicalTable[]`（含 `columns`）<br>`GET /api/tables/{name}/columns` | `POST /api/query-configs` / `PUT /api/query-configs/{id}` / `DELETE /api/query-configs/{id}` | `QueryConfigCreateRequest` ↔ 新增表 `query_config`（或复用 `decomm_schema_registry` 扩展） | 最复杂，需表 `query_config` + `field_mapping` + `join_config`，或 JSON 存 `config_json` |
| **DynamicQuery** | `POST /api/query/execute {configId,filters,sort,page,pageSize}` → `QueryResult{rows,total,sql}`<br>`GET /api/query/configs/{id}/enum?field=` | `GET /api/query/export?configId=&filters=` (Excel) | `FilterCondition[]` ↔ `DynamicQueryBuilder` | 后端 `queryEngine.ts` 逻辑搬运 + 白名单+参数化+UC 掩码 |
| **DbInspector** | `GET /api/tables` / `GET /api/tables/{name}/schema` / `GET /api/tables/{name}/data?page=&search=` | — | `PhysicalTable` | 需鉴权 `ADMIN`，直接查 `physicalTables` 模拟或真实 `information_schema` |
| **Users** | `GET /api/users?pageNum=&search=` → `PageResult<UserRecord>`<br>`GET /api/roles/options` / `GET /api/systems/options` | `POST /api/users` / `PUT /api/users/{id}` / `DELETE /api/users/{id}`<br>`PUT /api/users/{id}/systems {systemIds}` | `UserCreateRequest` ↔ `SysUser` | `systemIds` → `sys_user_role` + `sys_role_system` |
| **Roles** | `GET /api/roles?category=` → `RoleRecord[]`<br>`GET /api/permissions?category=` | `POST /api/roles` / `PUT /api/roles/{id}` / `DELETE /api/roles/{id}`<br>`PUT /api/roles/{id}/permissions {codes}` | `RoleCreateRequest` ↔ `SysRole` | `color/isBuiltin` 前端展示字段 |
| **Permissions** | `GET /api/permissions?module=&category=` → `PermissionRecord[]` | — | `SysPermission` | 只读，`V2__init_data.sql` 已种 27 条 |
| **Pages** | `GET /api/pages` → `PageRecord[]`<br>`GET /api/pages/user` → 过滤后 | `POST /api/pages` / `PUT /api/pages/{id}` / `PUT /api/pages/order {ids}` / `PUT /api/pages/{id}/visible` | `PageCreateRequest` ↔ `SysMenu` | `visibleTo: RoleKey[]` ↔ `sys_role_menu` |
| **Settings** | `GET /api/settings` → 6 块 | `PUT /api/settings/{section}` | `SettingsDTO` | 占位，前期 Mock |

---

## 三、联调策略（一次一页，不破 Demo）

1.  **契约先行**：每页先定 `Result/PageResult` DTO 与 `types.ts` 字段映射表（在 `frontend/src/types.ts` 旁新增 `api.types.ts`），后端 Mock 返回与 `mockData` 同构数据，确保前端零改动即可切。
2.  **Axios 层**：单文件 `frontend/src/lib/api.ts`（`axios.create({baseURL:'/api'})` + JWT 拦截 + `Result` 解包），`vite.config.ts` 代理 `'/api' → 'http://localhost:8080'`。
3.  **Mock→Real 平滑**：后端 Controller 先返回内存 `mockData`（如 `SystemsPage` 的 `systems`），前端切 `api.get` 后仍演示通过；再替换为 MyBatis-Plus 真查。
4.  **一页一 PR**：每页一个小 PR（≤150 行后端 + ≤80 行前端），标题 `feat(frontend): connect Systems page to /api/systems`，便于回滚。
5.  **验证**：每页完成后 `cd backend && mvn test && cd frontend && pnpm build`，并录 30 秒操作视频（登录→该页→刷新仍在）。

---

## 四、分 Phase 实施顺序（按依赖与演示价值）

| Phase | 页面 | 目标 | 依赖 | 预计 | 产出 |
|-------|------|------|------|------|------|
| **Phase 0 — 基座** | 无 | `api.ts` + 代理 + JWT 打通，Login 真实化 | 后端 Mock 已就绪 | 0.5 天 | `POST /api/auth/login` 可用，前端 `LoginPage` 切真实接口 |
| **Phase 1 — 核心链路** | **Systems** | 系统列表/搜索/分页/CRUD 真实化 | Phase 0 + `decomm_system` 表 | 1 天 | 演示“新增系统→列表出现” |
| **Phase 2 — 治理** | **Users / Roles / Permissions** | 用户与角色体系闭环 | Phase 1（需 systemIds） | 1.5 天 | 演示“建用户→分配角色与系统→该用户登录仅见分配系统” |
| **Phase 3 — 数据接入** | **DataSync / Schemas** | Job 列表与 Schema 浏览真实化 | Phase 1 | 1 天 | 演示“触发同步→Job 状态流转” |
| **Phase 4 — 查询核心** | **QueryConfigs → DynamicQuery → DbInspector** | 查询配置与动态查询全链路 | Phase 3（需表结构） | 2 天 | 演示“新建配置→加 Join/字段→执行→看 SQL→导出” |
| **Phase 5 — 增强** | **Dashboard / Pages / Settings** | 统计与治理增强 | 前序聚合 | 1 天 | 演示“仪表盘数字来自真实 COUNT/SUM” |

> **总计约 7 天**，每 Phase 可独立演示；你提到的“定期删除、日志追踪”在 Phase 3/4 的 Job Logs 与 Phase 5 的 Dashboard 中覆盖。

---

## 五、首个任务拆解（Phase 0 示例，待你确认后开工）

**Task P0-01：打通 `frontend/src/lib/api.ts` 与 `LoginPage`**

- 后端：`AuthController` 已 Mock，补充 `JwtTokenProvider`（jjwt）签发真实 Token + `SecurityConfig` 校验；`UserDetailsService` 读 `sys_user`（无则回退 mock `sarah.chen@company.com`）。
- 前端：`frontend/src/lib/api.ts`（新建 40 行）+ `LoginPage.tsx` 将 `setTimeout` 替换为 `api.post('/auth/login', {username: email, password})` + 存 `localStorage.token` + 错误提示。
- 验证：`curl -X POST http://localhost:8080/api/auth/login -d '{"username":"sarah.chen@company.com","password":"demo1234"}'` → 200 + `token`；前端登录后 `TopBar` 显示用户名且刷新不掉线。
- **不涉及**：`Systems` 等其他页仍用 `mockData`，不受影响。

---

## 六、风险与回滚

- **回滚**：每页保留 `mockData` 分支 `if (!USE_API) return mockData`，`USE_API` 环境变量一键切回。
- **鉴权**：初期 `SecurityConfig` 放行 `GET /api/systems` 等只读接口，避免阻塞演示；后续逐个加 `@PreAuthorize`。
- **数据**：`V2__init_data.sql` 已有 6 系统8用户，下一步 `V3` 补充 `query_config` 示例（直接复用 `queryData.ts` 的 3 条）。

---

## 七、确认事项（请回复）

1. 是否按上述 **Phase 0→5 顺序**推进？（可调整，例如先做 DynamicQuery）
2. 首个落地页是否从 **Phase 0 Login** 开始，还是直接 **Phase 1 Systems**？
3. 前端是否接受在 `frontend/src/lib/api.ts` 统一封装，还是希望每页独立 `fetch`？
4. 是否接受“先 Mock 再真查”的平滑策略（保证 Demo 始终可用）？

> 确认后，我将按 **一页一 PR** 节奏开工，首个 PR 为 `Phase 0 — api.ts + Login`，不做其他页改动。

