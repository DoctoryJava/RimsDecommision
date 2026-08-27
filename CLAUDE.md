# CLAUDE.md — Claude Code project memory

> Read every session. Keep **<150 lines / <2500 tokens** — longer files reduce adherence [1](https://www.anthropic.com/engineering/claude-code-best-practices). This file gives Claude the context a new senior teammate needs. For tool-agnostic rules see `@AGENTS.md`; for deep docs link to `docs/`.

@AGENTS.md

## Project overview

RIMS Decommission is enterprise Lakehouse for decommissioned-system **archive → query → destroy**: 1:1 ingest to **ADLS Gen2 Iceberg**, governed by **Unity Catalog**, queried via **Databricks SQL**, rendered by **Schema Registry-driven React 19 + Tailwind 4** dynamic forms/tables.

- Status: production-track, branch `arena/019fd5f0-rimsdecommision`
- Repo: single app, not monorepo. Primary users: SYSTEM_ADMIN / DATA_OPERATOR / AUDITOR / VIEWER
- Gotcha: data volume TB-scale — jobs must be sharded/parallel and idempotent (OVERWRITE/MERGE).

## Tech stack

| Layer | Choice | Where |
|-------|--------|-------|
| Backend | Java 17 + Spring Boot 3.2, MyBatis-Plus 3.5, Spring Security+JWT, Flyway | `backend/` |
| Meta DB | SQL Server 2019+ (config only), Redis 6 | `docker-compose.yml` |
| Big data | Databricks Java SDK (Jobs + Statement Execution API), UC, Iceberg | `scripts/databricks/` |
| Storage | ADLS Gen2 (Iceberg) + Azure Blob (attachments) + Key Vault | `storage/` |
| Frontend | React 19.2.8 + Vite 8.2 + Tailwind 4.3.3 + TypeScript 6 + pnpm | `frontend/src/` |

## Commands — exact strings

```bash
cd backend && mvn clean package -DskipTests
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev   # or test
cd backend && mvn test && mvn flyway:migrate
cd frontend && pnpm install && pnpm dev          # http://localhost:5173
cd frontend && pnpm build && pnpm lint --fix && pnpm type-check
docker-compose up -d sqlserver redis && docker-compose down -v
```

## Architecture notes — non-obvious decisions

- **Lakehouse**: `SQL Server (config) | Redis (token) | Databricks (compute) | ADLS Gen2 Iceberg (structured) + Blob (attachments)`. Diagram: `README.md §🏗️`.
- **Meta DB is T-SQL**: migrations live in `db/migration/sqlserver`; MyBatis-Plus paging uses `DbType.SQL_SERVER`, which emits `OFFSET/FETCH` and **requires every paged query to have `ORDER BY`**.
- Flow: `REGISTERED→CONFIGURED→SYNCING→ARCHIVED→EXPIRING→DESTROYED` (`decomm_system.status`, `decomm_lifecycle_policy`).

### ⚠️ Red lines — YOU MUST follow (emphasis improves adherence for critical 2-3 rules)

- **NEVER** store or query archived business data in the metadata DB (SQL Server) — **YOU MUST** use `DatabricksSqlExecutor` for reads and `DatabricksJobManager` for writes.
- **NEVER** store DB/Storage/Databricks Token in plaintext — **YOU MUST** use Key Vault/Secret Scope/env + `@JsonIgnore`.
- **NEVER** desensitize in JS/TS or Java — **YOU MUST** configure UC COLUMN MASK; `isPii` columns are masked by UC automatically.

The other two red lines (SAS ≤15 min, 1:1 lakehouse) are in `AGENTS.md §Constraints`; they are equally enforced but not repeated to save budget.

## Conventions

- Controller: `@Valid`+`@PreAuthorize`, returns `Result<T>`; Service: `XxxService`+`XxxServiceImpl` with `@Transactional`; Entity: MyBatis-Plus annotations.
- Frontend: `<script setup lang="ts">`, `defineProps<T>` + `defineEmits<{}>`, **no `any`**, `src/api/<domain>.ts` + `src/types/`.
- Dynamic frontend: `DynamicFilterForm`/`DynamicDataTable`/`DynamicColumn` in `src/components/dynamic/` — all driven by `schema_json.queryType/isPii/alias/listWidth`.
- Limits: Databricks SQL `LIMIT 100` default, `10000` max; cluster `auto-terminate 10 min`; jobs sharded for TB data.

## Key files — when to read which

- `README.md §🗄️ 数据库设计` — **SSOT for DDL** (with V1), JSON example, licenses.
- `scripts/sql/sqlserver/V1__init_schema.sql` — full 12-table T-SQL DDL; `V2__init_data.sql` — seed data.
- `scripts/sql/mysql/` — pre-migration MySQL scripts, kept for reference only; never execute them.
- `backend/.../databricks/DatabricksJobManager.java` — job submit/poll.
- `frontend/src/components/dynamic/` — dynamic rendering; change here if `schema_json` changes.
- `.env.example` — required envs (never commit `.env`).

## Do NOT

- Do NOT modify `V1/V2` migrations; create `V3__*.sql` only.
- Do NOT add `console.log`; use `src/utils/logger` (or `Slf4j` on backend).
- Do NOT add deps without asking; respect `pnpm` (never `npm`/`yarn`) and existing SDK versions.
- Do NOT touch `sys_*` RBAC tables directly; go through `Auth/RBAC` services.

## Workflow

- Explore → Plan → Code: use plan mode (`Shift+Tab`) before editing; ask for approval.
- Small PRs, `feat|fix|docs|refactor|test|chore(scope): subject`, squash merge, one feature per PR.
- Before marking done, run **Verification** below; if Claude keeps erring, prune this file (ask: *Would removing this line cause mistake?*).

## Verification — give Claude a way to check itself

```bash
# backend
cd backend && mvn test
# frontend
cd frontend && pnpm lint && pnpm type-check
# if DB changed
cd backend && mvn flyway:info
```

A PR is done when: `mvn test` passes, `pnpm build` succeeds, `pnpm lint` clean, Databricks SQL returns masked result, SAS URL expires in 15 min, audit row in `sys_audit_log` exists.

## API surface — link, don't duplicate

Conventions: `Authorization: Bearer {jwt}`, base `/api`, page `?pageNum=&pageSize=`, ISO8601 time. Full endpoints: SpringDoc at `/swagger-ui` + `docs/api/`. Core groups: `auth/users/roles/menus`, `systems/db-config/storage-config/schemas`, `sync/jobs`, `systems/{id}/query|tables|attachments/sas`, `lifecycle/audit`. (Details previously bloated this file — now linked.)

---
*Keep root <150 lines; push path-specific detail to `.claude/rules/*.md` that loads only on matching globs. Treat this file like code: review when Claude errs and prune quarterly.*
