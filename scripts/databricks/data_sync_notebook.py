# Databricks Notebook: 数据同步入湖 (Iceberg + Unity Catalog)
# ================================================================
# 用途: 从源数据库 JDBC 读取数据，1:1 原样写入 Azure ADLS Gen2 (Iceberg 格式)，
#       并注册到 Unity Catalog 进行统一治理。
# 触发: 由 RIMS Decommission 后端通过 Databricks Java SDK 提交执行。
# ================================================================

# Databricks notebook source
# MAGIC %md
# MAGIC # RIMS Decommission - 数据同步入湖
# MAGIC
# MAGIC ## 执行流程
# MAGIC 1. 从源数据库 (MySQL/Oracle/PostgreSQL/SQLServer/DB2) JDBC 读取
# MAGIC 2. 1:1 原样写入 Azure ADLS Gen2 (Iceberg 格式)
# MAGIC 3. 注册到 Unity Catalog: `{catalog}.{system_code}.{table_name}`
# MAGIC 4. 附件文件复制到 Azure Blob Storage

# COMMAND ----------

# ============================================================
# Widget 参数 (由后端在提交 Job 时注入)
# ============================================================
dbutils.widgets.dropdown("source_db_type", "MYSQL",
    ["MYSQL", "POSTGRESQL", "ORACLE", "SQLSERVER", "DB2"], "源数据库类型")
dbutils.widgets.text("source_host", "", "源数据库地址")
dbutils.widgets.text("source_port", "3306", "源数据库端口")
dbutils.widgets.text("source_database", "", "源数据库名")
dbutils.widgets.text("source_schema", "", "源 Schema (可选)")
dbutils.widgets.text("source_username", "", "源数据库用户名")
dbutils.widgets.text("source_password", "", "源数据库密码")
dbutils.widgets.text("source_tables", "", "同步表列表(逗号分隔)")
dbutils.widgets.text("target_storage_account", "", "Azure 存储账户名")
dbutils.widgets.text("target_container", "", "ADLS 容器/文件系统名")
dbutils.widgets.text("target_path_prefix", "archive", "目标路径前缀")
dbutils.widgets.text("blob_container", "", "附件 Blob 容器名 (可选)")
dbutils.widgets.text("system_code", "", "系统编码 (e.g. CRM_V1)")
dbutils.widgets.text("uc_catalog", "lake", "Unity Catalog 名")
dbutils.widgets.text("job_id", "", "RIMS 任务ID")
dbutils.widgets.text("callback_url", "", "后端回调URL (可选)")

# COMMAND ----------

# ============================================================
# 读取参数
# ============================================================
source_db_type = dbutils.widgets.get("source_db_type")
source_host = dbutils.widgets.get("source_host")
source_port = dbutils.widgets.get("source_port")
source_database = dbutils.widgets.get("source_database")
source_schema = dbutils.widgets.get("source_schema")
source_username = dbutils.widgets.get("source_username")
source_password = dbutils.widgets.get("source_password")
source_tables = [t.strip() for t in dbutils.widgets.get("source_tables").split(",") if t.strip()]
target_storage_account = dbutils.widgets.get("target_storage_account")
target_container = dbutils.widgets.get("target_container")
target_path_prefix = dbutils.widgets.get("target_path_prefix")
blob_container = dbutils.widgets.get("blob_container")
system_code = dbutils.widgets.get("system_code")
uc_catalog = dbutils.widgets.get("uc_catalog")
job_id = dbutils.widgets.get("job_id")
callback_url = dbutils.widgets.get("callback_url")

uc_schema = system_code  # UC schema 名 = 系统编码
base_adls_path = f"abfss://{target_container}@{target_storage_account}.dfs.core.windows.net/{target_path_prefix}/{system_code}"

print(f"[CONFIG] System: {system_code}")
print(f"[CONFIG] Source: {source_db_type}://{source_host}:{source_port}/{source_database}")
print(f"[CONFIG] Target: {base_adls_path}")
print(f"[CONFIG] UC: {uc_catalog}.{uc_schema}")
print(f"[CONFIG] Tables: {source_tables}")

# COMMAND ----------

# ============================================================
# 构建 JDBC URL
# ============================================================
jdbc_configs = {
    "MYSQL": {
        "url": f"jdbc:mysql://{source_host}:{source_port}/{source_database}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
        "driver": "com.mysql.cj.jdbc.Driver"
    },
    "POSTGRESQL": {
        "url": f"jdbc:postgresql://{source_host}:{source_port}/{source_database}",
        "driver": "org.postgresql.Driver"
    },
    "ORACLE": {
        "url": f"jdbc:oracle:thin:@{source_host}:{source_port}/{source_database}",
        "driver": "oracle.jdbc.OracleDriver"
    },
    "SQLSERVER": {
        "url": f"jdbc:sqlserver://{source_host}:{source_port};databaseName={source_database};encrypt=false",
        "driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
    },
    "DB2": {
        "url": f"jdbc:db2://{source_host}:{source_port}/{source_database}",
        "driver": "com.ibm.db2.jcc.DB2Driver"
    }
}

jdbc_config = jdbc_configs.get(source_db_type.upper())
if not jdbc_config:
    raise ValueError(f"Unsupported database type: {source_db_type}")

jdbc_url = jdbc_config["url"]
jdbc_driver = jdbc_config["driver"]
print(f"[CONFIG] JDBC URL: {jdbc_url}")

# COMMAND ----------

# ============================================================
# 配置 ADLS Gen2 访问 (使用 Service Principal 或 Managed Identity)
# ============================================================
# 注意: 生产环境应使用 Databricks Secret Scope 引用凭据
# spark.conf.set(f"fs.azure.account.auth.type.{target_storage_account}.dfs.core.windows.net", "OAuth")
# spark.conf.set(f"fs.azure.account.oauth.provider.type.{target_storage_account}.dfs.core.windows.net",
#     "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider")
# 此处假设 Databricks 已通过 Access Connector 或 Credential 配置好存储访问权限

# COMMAND ----------

# ============================================================
# 创建 Unity Catalog Schema (如果不存在)
# ============================================================
spark.sql(f"CREATE CATALOG IF NOT EXISTS {uc_catalog}")
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {uc_catalog}.{uc_schema} "
          f"COMMENT 'RIMS Archive: {system_code}'")
print(f"[UC] Schema created: {uc_catalog}.{uc_schema}")

# COMMAND ----------

# ============================================================
# 数据同步核心逻辑
# ============================================================
import time
import json
from datetime import datetime

sync_results = []
total_start = time.time()

for idx, table_name in enumerate(source_tables, 1):
    print(f"\n{'='*60}")
    print(f"[{idx}/{len(source_tables)}] 同步表: {table_name}")
    print(f"{'='*60}")

    table_start = time.time()

    try:
        # ---- Step 1: 从源数据库读取 ----
        dbtable = f"{source_schema}.{table_name}" if source_schema else table_name

        df = (spark.read
              .format("jdbc")
              .option("url", jdbc_url)
              .option("driver", jdbc_driver)
              .option("dbtable", dbtable)
              .option("user", source_username)
              .option("password", source_password)
              .option("fetchsize", "10000")
              .option("numPartitions", "4")
              .load())

        row_count = df.count()
        print(f"[READ] 读取 {row_count} 行, Schema: {df.schema.simpleString()}")

        # ---- Step 2: 写入 ADLS Gen2 (Iceberg 格式) ----
        table_path = f"{base_adls_path}/{table_name}"

        (df.write
            .format("iceberg")
            .mode("overwrite")
            .option("compression", "snappy")
            .saveAsTable(f"{uc_catalog}.{uc_schema}.{table_name}"))

        print(f"[WRITE] Iceberg 表写入完成: {uc_catalog}.{uc_schema}.{table_name}")
        print(f"[WRITE] 存储路径: {table_path}")

        # ---- Step 3: 收集统计信息 ----
        spark.sql(f"ANALYZE TABLE {uc_catalog}.{uc_schema}.{table_name} COMPUTE STATISTICS")

        duration = time.time() - table_start
        print(f"[DONE] 耗时 {duration:.2f}s, {row_count} 行")

        sync_results.append({
            "table": table_name,
            "status": "SUCCESS",
            "rows": row_count,
            "uc_name": f"{uc_catalog}.{uc_schema}.{table_name}",
            "storage_path": table_path,
            "duration_seconds": round(duration, 2)
        })

    except Exception as e:
        duration = time.time() - table_start
        error_msg = str(e)[:500]
        print(f"[ERROR] 同步失败: {error_msg}")

        sync_results.append({
            "table": table_name,
            "status": "FAILED",
            "error": error_msg,
            "duration_seconds": round(duration, 2)
        })

# COMMAND ----------

# ============================================================
# 汇总结果 + 回调
# ============================================================
total_duration = time.time() - total_start
total_rows = sum(r.get("rows", 0) for r in sync_results)
success_count = sum(1 for r in sync_results if r["status"] == "SUCCESS")
failed_count = sum(1 for r in sync_results if r["status"] == "FAILED")

summary = {
    "job_id": job_id,
    "system_code": system_code,
    "uc_schema": f"{uc_catalog}.{uc_schema}",
    "total_tables": len(sync_results),
    "success_count": success_count,
    "failed_count": failed_count,
    "total_rows": total_rows,
    "total_duration_seconds": round(total_duration, 2),
    "results": sync_results,
    "completed_at": datetime.now().isoformat()
}

print(f"\n{'='*60}")
print(f"[SUMMARY] {json.dumps(summary, indent=2, ensure_ascii=False)}")
print(f"{'='*60}")

# 如果有回调 URL，发送结果
if callback_url:
    import urllib.request
    try:
        req = urllib.request.Request(
            callback_url,
            data=json.dumps(summary).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        urllib.request.urlopen(req, timeout=30)
        print(f"[CALLBACK] 结果已回调: {callback_url}")
    except Exception as e:
        print(f"[CALLBACK] 回调失败: {e}")

# 输出结果给 Databricks Job
dbutils.notebook.exit(json.dumps(summary))
