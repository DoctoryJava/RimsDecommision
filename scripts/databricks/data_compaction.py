# Databricks Notebook: 小文件合并 (Compaction)
# ================================================================
# 用途: 定期合并 Iceberg 表中的小文件，提升查询性能。
# 触发: 定时调度 (建议每周执行一次)。
# ================================================================

# Databricks notebook source
# MAGIC %md
# MAGIC # RIMS Decommission - 小文件合并
# MAGIC
# MAGIC 退役系统数据同步时可能产生大量小文件 (每次同步一个 partition)，
# MAGIC 本 Notebook 对 Iceberg 表执行 OPTIMIZE / REWRITE 操作合并小文件。

# COMMAND ----------

dbutils.widgets.text("uc_catalog", "lake", "Unity Catalog 名")
dbutils.widgets.text("system_code", "", "系统编码 (留空=处理所有)")
dbutils.widgets.text("target_file_size", "128mb", "目标文件大小")
dbutils.widgets.text("job_id", "", "任务ID")

# COMMAND ----------

uc_catalog = dbutils.widgets.get("uc_catalog")
system_code = dbutils.widgets.get("system_code")
target_file_size = dbutils.widgets.get("target_file_size")
job_id = dbutils.widgets.get("job_id")

import json
from datetime import datetime

results = []

# 获取需要处理的 schema 列表
if system_code:
    schemas = [system_code]
else:
    schemas_df = spark.sql(f"SHOW SCHEMAS IN {uc_catalog}")
    schemas = [row.databaseName for row in schemas_df.collect()
               if row.databaseName not in ('default', 'information_schema')]

print(f"[COMPACT] Processing schemas: {schemas}")

# COMMAND ----------

for schema_name in schemas:
    print(f"\n{'='*60}")
    print(f"Schema: {uc_catalog}.{schema_name}")
    print(f"{'='*60}")

    try:
        tables_df = spark.sql(f"SHOW TABLES IN {uc_catalog}.{schema_name}")
        tables = [row.tableName for row in tables_df.collect()]

        for table_name in tables:
            full_name = f"{uc_catalog}.{schema_name}.{table_name}"
            print(f"\n  Compacting: {full_name}")

            try:
                # Iceberg REWRITE DATA 合并小文件
                spark.sql(f"""
                    OPTIMIZE {full_name}
                    REWRITE DATA USING BIN_PACK
                """)
                print(f"  [OK] {full_name} compacted")
                results.append({
                    "table": full_name,
                    "status": "SUCCESS"
                })
            except Exception as e:
                print(f"  [WARN] {full_name}: {e}")
                results.append({
                    "table": full_name,
                    "status": "SKIPPED",
                    "reason": str(e)[:200]
                })

    except Exception as e:
        print(f"[ERROR] Schema {schema_name}: {e}")

# COMMAND ----------

summary = {
    "job_id": job_id,
    "total_tables": len(results),
    "compacted": sum(1 for r in results if r["status"] == "SUCCESS"),
    "skipped": sum(1 for r in results if r["status"] == "SKIPPED"),
    "results": results,
    "completed_at": datetime.now().isoformat()
}

print(f"\n[SUMMARY] {json.dumps(summary, indent=2)}")
dbutils.notebook.exit(json.dumps(summary))
