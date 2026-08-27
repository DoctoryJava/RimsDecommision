# AGENTS.md — Operational guide for AI coding agents

> **Scope**: Read by Codex, Cursor, Copilot, Claude Code and 28+ tools at session start. Keep it **operational, not explanatory**. Every line must change what the agent does; if removing it wouldn't cause a mistake, delete it. For deep design, see `README.md` and `docs/` (progressive disclosure). [1](https://thepromptshelf.dev/blog/agents-md-codex-setup-guide-2026/) [2](https://developers.openai.com/codex/learn/best-practices)

## Project overview

RIMS Decommission = Lakehouse platform (Databricks + ADLS Gen2 Iceberg + Unity Catalog + React 19 + Tailwind 4) that **1:1 archives, queries and destroys** decommissioned systems (ERP/CRM/OA) before servers are wiped. Detailed pain points & 4-phase flows: `README.md §📋/§🧩`.

## Repo layout

```text
backend/src/main/java/com/rims/decommission/  # Spring Boot 3: controller→service→mapper→SQL Server + databricks/storage/schema
frontend/src/                                  # React 19 + Vite 8 + Tailwind 4 + TypeScript strict
scripts/sql/sqlserver/                         # Flyway T-SQL V1-V18 — SSOT for DB (README §🗄️ is summary)
scripts/sql/mysql/                             # legacy MySQL scripts, reference only — never run
scripts/databricks/                            # data_sync/compaction/destroy notebooks
docs/                                          # PHASE1/2/3_TASK_PLAN.md + phase*_tasks.csv (task.csv subsets)
```

## Commands — exact strings Claude can't guess

```bash
cd backend && mvn clean package -DskipTests   # build
cd backend && mvn spring-boot:run             # run dev (profile dev)
cd backend && mvn test                         # unit tests
cd backend && mvn flyway:migrate && mvn flyway:info  # DB migrate / status, never manual ALTER
cd frontend && pnpm install && pnpm dev        # dev http://localhost:5173
cd frontend && pnpm build && pnpm lint && pnpm type-check
docker-compose up -d sqlserver redis           # infra only（sqlserver-init 负责 CREATE DATABASE）
```

## Conventions — only what linter/code can't tell you

- MyBatis-Plus: `@TableName/@TableId(ASSIGN_ID)/@TableLogic`, `MetaObjectHandler` for timestamps, `Long` snowflake IDs.
- Result envelope: `Result<T>{code,message,data,timestamp}` + `PageResult<T>`.
- Source tables → Iceberg **1:1**, keep names/types/precision; Chinese via `schema_json.alias` only.
- `decomm_schema_registry.schema_json` drives `DynamicFilterForm`/`DynamicDataTable`/`DynamicColumn`:
  `equal→el-input`, `like→el-input+ %`, `range→2×el-input-number`, `date-range→el-date-picker`, `select→el-select(enumValues)`.
- All archived **reads via `DatabricksSqlExecutor` (Statement Execution API, 30s timeout, LIMIT 100 default / 10000 max)**; all **writes via `DatabricksJobManager`**.
- Sensitive columns (`isPii`): **UC COLUMN MASK only** (`MASK_FULL`/`MASK_FIRST_N`), never in JS/Java.
- Attachments: **SAS ≤15 min** via `BlobSasService`; frontend never holds Access Key; verify path prefix + RBAC + audit.
- Sealed hierarchy: `decomm_system.status` `REGISTERED→CONFIGURED→SYNCING→ARCHIVED→EXPIRING→DESTROYED`.

## Constraints — Do NOT (agent guardrails)

- Do NOT edit existing `scripts/sql/sqlserver/V*.sql`; add a new `V19__*.sql` (T-SQL) instead.
- Do NOT point Flyway at `scripts/sql/mysql/` or `db/migration/mysql/`; those are frozen references.
- Do NOT write MySQL-only syntax (backticks, `LIMIT`, `AUTO_INCREMENT`, `ON UPDATE CURRENT_TIMESTAMP`); use `[ ]`, `OFFSET/FETCH` or `TOP`, `IDENTITY`, and `FieldFill.INSERT_UPDATE`.
- Do NOT edit `scripts/databricks/*.py` without updating backend `DatabricksJobManager` param assembly.
- Do NOT store DB/Storage/Databricks secrets in plaintext; use `KeyVaultService`/`Secret Scope`/env, `@JsonIgnore` on entities.
- Do NOT query archived business data from the metadata DB; SQL Server holds only config/RBAC/audit.
- Do NOT bypass `DynamicQueryBuilder` whitelist + parameterized SQL.
- Do NOT `import` across frontend `decommission/` boundaries; keep `components/dynamic/` generic.

## PR & workflow

- Branch: `arena/*` (session-fixed), Conventional Commits: `feat|fix|docs|refactor|test|chore(scope): ...`.
- When adding API: `Controller+Service+Mapper+DTO` + `frontend/src/api/*.ts` + `src/types/*.ts` together.
- When adding page: `views/*` + `router` + `store` (if needed) together.
- Run verification before marking done (see below); `docs/PHASE*_TASK_PLAN.md` defines phase scope.

## Done when — verification checklist (MUST run)

```bash
cd backend && mvn test
cd frontend && pnpm lint && pnpm type-check && pnpm build
cd backend && mvn flyway:info  # if DB touched
# manual: Databricks SQL masked result checked, SAS expires in 15 min, audit log written
```

## Pointers — load only when needed (avoid bloating every session)

- DB schema SSOT: `README.md §🗄️ 数据库设计` + `scripts/sql/sqlserver/V1__init_schema.sql`. **Never duplicate DDL here.**
- Business flows (5 logics): `README.md §🧩 核心业务流程` + prior detailed edition archived at `git show HEAD~1:AGENTS.md`.
- API surface: `CLAUDE.md §API` + SpringDoc (`/swagger-ui`), `docs/api/` if present.
- Phase plans & task CSVs: `docs/PHASE*_TASK_PLAN.md`, `docs/phase*_tasks.csv` (26/63/24 items), `task.csv`.
- Copilot short rules: `.github/copilot-instructions.md`.

> Keep this file **<120 lines**. If Claude still makes a mistake without a rule, add it; otherwise prune. For task-specific deep guides, create `docs/agent-guides/*.md` and reference its path here.
