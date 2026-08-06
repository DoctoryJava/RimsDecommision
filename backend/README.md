# Backend — RIMS Decommission (Spring Boot)

> Java 17 + Spring Boot 3.2.5 + MyBatis-Plus 3.5.7 + Flyway + MySQL 8 + Redis + Databricks SDK + Spring Security JWT
> 参见 `AGENTS.md` / `CLAUDE.md` 与 `docs/BOLT_FRONTEND_ANALYSIS.md`

## 快速开始

```bash
cd backend
# 需本地 MySQL + Redis，或用 dev 内存模式
mvn clean package -DskipTests
mvn spring-boot:run -Dspring-boot.run.profiles=dev  # H2 + mock Databricks
# 或
mvn spring-boot:run  # 需真实 MySQL/Redis，见 application.yml

# Swagger
open http://localhost:8080/swagger-ui.html
```

## 目录（与 AGENTS.md 一致）

```
backend/src/main/java/com/rims/decommission/
├── common/          # Result<T>, PageResult<T>, BusinessException, GlobalExceptionHandler
├── config/          # MybatisPlus, Security, WebCors
├── security/        # JwtTokenProvider
├── entity/          # SysUser, DecommSystem, ...
├── mapper/          # MyBatis-Plus Mapper
├── dto/             # LoginRequest/Response, QueryRequest
├── service/         # 业务逻辑
├── controller/      # Auth, System, Schema, Query, ...
├── databricks/      # DatabricksJobManager, DatabricksSqlExecutor, UnityCatalogManager (TODO)
└── storage/         # AdlsService, BlobSasService, KeyVaultService (TODO)
```

## 已实现（最小闭环 Mock）

- `POST /api/auth/login` / `POST /api/auth/logout` / `GET /api/auth/user-info` — Mock JWT
- `GET /api/systems` / `POST /api/systems` / `GET /api/systems/{id}` / `PUT /api/systems/{id}` — 分页占位
- `GET /api/systems/{id}/schemas` / `POST /api/systems/{id}/schemas/discover`
- `POST /api/systems/{id}/query` / `GET /api/systems/{id}/tables` / `GET /api/systems/{id}/attachments/sas`

> 后续按 `docs/PHASE1_TASK_PLAN.md` 实现真实 MyBatis-Plus 查询、Databricks SQL 与 UC 掩码。

## 配置

- `application.yml` 默认 MySQL `rims_decommission` + Redis，Flyway 自动迁移 `V1__init_schema.sql`
- `application-dev.yml` 切 H2 内存 + mock Databricks，无需外部依赖即可 `mvn spring-boot:run -Dspring-boot.run.profiles=dev`
- 环境变量：`MYSQL_URL` / `MYSQL_USERNAME` / `MYSQL_PASSWORD` / `REDIS_HOST` / `JWT_SECRET` / `DATABRICKS_*`

## 与 Bolt 前端联调

Bolt 前端（`project-bolt-sb1-pt4jvqwm.zip` / `frontend/`）当前直连 `mockData.ts`。联调时在 `frontend/src/lib/api.ts` 中加入：

```ts
import axios from 'axios'
export const api = axios.create({ baseURL: '/api', headers: { Authorization: `Bearer ${token}` }})
// 将 mockData 替换为 api.get('/systems') 等
```

详见 `docs/BOLT_FRONTEND_ANALYSIS.md` §6.5 契约。

## 验证

```bash
cd backend && mvn test
cd backend && mvn flyway:info
curl http://localhost:8080/api/auth/user-info
```
