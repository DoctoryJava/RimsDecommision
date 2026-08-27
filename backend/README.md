# Backend — RIMS Decommission (Spring Boot)

> Java 17 + Spring Boot 3.2.5 + MyBatis-Plus 3.5.7 + Flyway + SQL Server 2019+ + Redis + Databricks SDK + Spring Security JWT
> 参见 `AGENTS.md` / `CLAUDE.md` 与 `docs/BOLT_FRONTEND_ANALYSIS.md`

## 快速开始

```bash
# 先起本地 SQL Server（首次需手工建库）
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Qq4188.1" \
  -p 1433:1433 --name sql1 --hostname sql1 -d mcr.microsoft.com/mssql/server:2025-latest
docker exec -it sql1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Qq4188.1' -C \
  -Q "IF DB_ID('RimsDecommission') IS NULL CREATE DATABASE [RimsDecommission];"

cd backend
mvn clean package -DskipTests
mvn spring-boot:run -Dspring-boot.run.profiles=dev  # 本地 SQL Server + mock Databricks
# 或
mvn spring-boot:run  # 见 application.yml（同样连 SQL Server）

# Swagger
open http://localhost:8080/swagger-ui.html
```

> Flyway 启动时自动执行 `classpath:db/migration/sqlserver` 下的 V1–V18（T-SQL）。
> 库需事先存在——SQL Server 的 JDBC 驱动不支持自动建库。

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

- `application.yml` 默认 SQL Server `RimsDecommission`（`localhost:1433`，`sa`）+ Redis，Flyway 自动迁移 `db/migration/sqlserver/V1__init_schema.sql` 起的全部脚本
- `application-dev.yml` 连本地 Docker SQL Server + mock Databricks/Storage
- `application-test.yml` 用 H2 `MODE=MSSQLServer` 内存库 + `schema.sql`/`data.sql`，`mvn test` 无需外部数据库
- 环境变量：`SQLSERVER_URL` / `SQLSERVER_USERNAME` / `SQLSERVER_PASSWORD` / `REDIS_HOST` / `JWT_SECRET` / `DATABRICKS_*`
- 迁移脚本目录：`db/migration/sqlserver`（生效）与 `db/migration/mysql`（迁移前留档，不执行）

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
