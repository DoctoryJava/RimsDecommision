# 元数据库迁移指南：MySQL → SQL Server

> 本次迁移只涉及**应用自身的元数据库**（配置 / Schema 注册 / RBAC / 审计）。
> 被归档的**源业务库**仍可以是 MySQL / Oracle / PostgreSQL / SQL Server / MongoDB，
> 因此 `mysql-connector-j` 依然保留在 `backend/pom.xml` 中。

---

## 1. 启动本地 SQL Server

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Qq4188.1" \
  -p 1433:1433 --name sql1 --hostname sql1 \
  -d mcr.microsoft.com/mssql/server:2025-latest
```

**必须先手工建库**——SQL Server 的 JDBC 驱动不会自动创建数据库：

```bash
docker exec -it sql1 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Qq4188.1' -C \
  -Q "IF DB_ID('RimsDecommission') IS NULL CREATE DATABASE [RimsDecommission];"
```

随后 `mvn spring-boot:run` 时 Flyway 会自动执行 `classpath:db/migration/sqlserver` 下的 V1–V18。

> `docker-compose.yml` 中的 `sqlserver-init` 服务已自动完成上面这步建库。

---

## 2. 目录布局

| 路径 | 作用 |
|------|------|
| `scripts/sql/sqlserver/` | **生效**的 T-SQL 迁移脚本 V1–V18（含仅此目录存在的 `V2__init_data.sql`） |
| `scripts/sql/mysql/` | 迁移前的 MySQL 脚本，**仅作历史参考，不再执行** |
| `backend/src/main/resources/db/migration/sqlserver/` | Flyway 实际加载目录（17 个文件，不含 V2，与迁移前布局一致） |
| `backend/src/main/resources/db/migration/mysql/` | 同上的 MySQL 留档 |

新增变更请追加 `V19__*.sql`（T-SQL），**不要修改已有脚本**。

---

## 3. 语法映射对照

| MySQL | SQL Server (T-SQL) | 说明 |
|-------|--------------------|------|
| `` `ident` `` | `[ident]` | 标识符引用 |
| `VARCHAR(n)` | `NVARCHAR(n)`；n>4000 → `NVARCHAR(MAX)` | 统一 Unicode，避免中文乱码 |
| `JSON` / `TEXT` / `LONGTEXT` | `NVARCHAR(MAX)` | 配合 `JacksonTypeHandler` |
| `DATETIME` / `TIMESTAMP` | `DATETIME2(3)` | 保留毫秒精度 |
| `CHAR(n)` | `NCHAR(n)` | |
| `DEFAULT CURRENT_TIMESTAMP` | `CONSTRAINT [df_<表>_<列>] DEFAULT SYSDATETIME()` | 默认值必须具名，否则无法 DROP |
| `ON UPDATE CURRENT_TIMESTAMP` | **已移除** | T-SQL 需触发器；改由 Java 侧 `FieldFill.INSERT_UPDATE` 维护（26 个实体全部已覆盖） |
| `UNIQUE KEY x (...)` | `CONSTRAINT [x] UNIQUE (...)` | |
| `KEY x (...)`（表内） | 独立 `CREATE INDEX [x] ON [t] (...)` | T-SQL 不支持表内定义普通索引 |
| `LIMIT n` | `TOP n` 或 `OFFSET 0 ROWS FETCH NEXT n ROWS ONLY` | 后者**必须**带 `ORDER BY` |
| `CONCAT(a, b)` | `a + b` | |
| `JSON_ARRAY()` / `JSON_OBJECT()` | 直接写 JSON 字符串字面量 | 仅 V4 用到（137 处） |
| `@rownum := @rownum + 1` | `ROW_NUMBER() OVER (ORDER BY [id])` | V2 生成自增序号 |
| 含中文的字面量 | 加 `N` 前缀：`N'订单表'` | 否则非 Unicode 字符会丢失 |

> **约束名全库唯一**：SQL Server 要求 `CONSTRAINT` 名称在库内唯一（MySQL 只要求表内唯一）。
> 已核对无重名。索引名允许重复（`idx_system_id` 等分布在不同表上）。

---

## 4. 代码侧改动

- `MybatisPlusConfig`：`PaginationInnerInterceptor(DbType.SQL_SERVER)`。
  **⚠️ 该方言生成 `OFFSET ... FETCH NEXT`，要求分页语句必须带 `ORDER BY`**，
  否则运行期抛异常。当前 6 处 `selectPage` 调用（其中 2 处经 `SystemController`/`UserController`
  的 `service.page(...)` 间接调用）均已显式 `orderBy`，新增分页查询务必照做。
- `DashboardController` / `SeaTunnelSyncService`：`.last("LIMIT n")` → `.last("OFFSET 0 ROWS FETCH NEXT n ROWS ONLY")`。
- `QueryController`：回显给前端的 SQL 改为 T-SQL 的 `ORDER BY ... OFFSET/FETCH`。
- `SeaTunnelSyncService.countSourceRows`：原先硬编码反引号（只对 MySQL 源库有效），
  改为通过 `DatabaseMetaData.getIdentifierQuoteString()` 取驱动自身的引用符，并带上 schema 限定，
  从而兼容 SQL Server / PostgreSQL / Oracle 源库。
- `frontend/src/lib/sqlBuilder.ts`：预览 SQL 由 `LIMIT 100` 改为 `SELECT TOP 100`。

---

## 5. 测试

测试仍使用 H2 内存库，无需外部数据库：

```yaml
url: jdbc:h2:mem:rims_test;MODE=MSSQLServer;DATABASE_TO_LOWER=TRUE
```

`backend/src/test/resources/schema.sql` / `data.sql` 已转为 T-SQL。与生产脚本的两点**有意差异**：

1. H2 没有 `NVARCHAR(MAX)`，测试里用 `NVARCHAR(4000)`（最长种子数据 200 字符，够用）；
2. 用 `CREATE TABLE IF NOT EXISTS` 保证重复初始化幂等（T-SQL 无此语法）。

### ⚠️ 为什么测试不能直接跑生产迁移脚本

H2 的 `MODE=MSSQLServer` 只是**部分**模拟 T-SQL。以下三种写法是**合法 T-SQL**
（已对照 MS Learn `ALTER TABLE` / `CREATE TABLE` 语法定义），但 H2 **解析失败**，
因此测试改用手写的 `schema.sql`，而不是直接执行 `db/migration/sqlserver/*.sql`：

| 写法 | 生产 SQL Server | H2 MSSQLServer 模式 |
|------|-----------------|---------------------|
| `a INT NOT NULL CONSTRAINT df_x DEFAULT 1`（具名默认值约束） | ✅ | ❌ 解析失败 |
| `ALTER TABLE t ADD b INT NULL, c INT NULL`（单语句多列） | ✅ | ❌ 解析失败（需拆成多条） |
| `DEFAULT SYSDATETIME()` | ✅ | ❌ 不识别（H2 用 `CURRENT_TIMESTAMP`） |
| `NVARCHAR(MAX)` | ✅ | ✅（但测试里仍用 `NVARCHAR(4000)`） |
| 不加引号的 `rows` / `columns` 列名 | ✅ | ✅ 实测通过 |

以上结论均为**实机验证**（H2 2.2.224 + JDK 25，逐条 DDL 隔离测试），不是推断。

### 已知注意点

- `r_physical_table` 有 `[rows]` / `[columns]` 两列。`ROWS` 在 H2 与 SQL Server 中都属于
  **保留字 / 上下文相关关键字**，DDL 里已用方括号包裹。MyBatis-Plus 生成 DML 时不加引号——
  已在 H2 上实测 `SELECT id, name, columns, rows FROM r_physical_table` 可正常执行。
  若后续升级 H2/驱动后出现 `Syntax error`，可在实体上改用 `@TableField("[rows]")`
  或给数据源加 `SET NON_KEYWORDS ROWS`。

---

## 6. 本次迁移的验证方式与局限

沙箱内无 `mvn` / `docker`，Maven 中央仓库不可达，因此**未运行完整的 `mvn test`
（Spring 上下文 + MyBatis-Plus 拦截器），也未在真实 SQL Server 上跑过 Flyway**。

但通过 JDK 25 + H2 2.2.224（jar 经 SHA-256 校验，与官方发布件一致）已完成**实机执行**验证：

| 验证项 | 方式 | 结果 |
|--------|------|------|
| `schema.sql` 在 `MODE=MSSQLServer` 下建表 | H2 RunScript 实跑 | ✅ 无错误，23 张表 |
| `data.sql` 种子数据导入 | H2 RunScript 实跑 | ✅ 无错误 |
| 测试断言依赖的行数 | `SELECT COUNT(*)` | ✅ 系统 6 / 用户 8 / 角色 7 / 活跃度 7 / 查询配置 2 |
| 中文 `N'...'` 字面量往返 | 库内 `=` 比较 | ✅ 未乱码 |
| 不加引号的 `rows` / `columns` | 实跑 SELECT | ✅ 通过 |
| `OFFSET/FETCH` 分页（对应 `DbType.SQL_SERVER`） | 实跑 | ✅ page(1,2) 返回 sys-001/sys-002，total=6 |
| 两处 `.last("OFFSET 0 ROWS FETCH NEXT n ROWS ONLY")` | 实跑 | ✅ 分别返回 7 行 / 1 行 |

静态验证：

- `sqlglot`（`read='tsql'`）解析全部 18 个迁移脚本 + 测试 schema/data：**0 失败**；
- 与 MySQL 原脚本做结构化比对（43 张表 / 62 个索引约束 / 183 行种子数据）：**0 差异**；
- tree-sitter 解析 100 个 Java 源文件：**0 语法错误**；
- 种子数据列数与 schema 逐行核对：**42 行全部一致**；
- 6 处 `selectPage` 分页查询逐一确认带 `ORDER BY`。

**上线前仍需**：在真实 SQL Server 上跑一遍 `docker compose up` + Flyway 迁移与 `mvn test`
（上表的 H2 实跑不能替代——H2 与 SQL Server 的语法覆盖面不同，见上一节的差异表）。
