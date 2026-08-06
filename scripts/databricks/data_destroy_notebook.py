# Databricks Notebook: 数据物理销毁 (DROP + VACUUM)
# ================================================================
# 用途: 对超过保留期限的退役系统数据执行物理销毁。
#       包括: DROP Iceberg 表 + VACUUM 清理文件 + 清理 UC 注册
# 触发: 由 RIMS Decommission 后端 LifecycleDestroyService 提交执行。
# 警告: 此操作不可逆！执行前必须经过管理员确认。
# ================================================================

# Databricks notebook source
# MAGIC %md
# MAGIC # RIMS Decommission - 数据物理销毁
# MAGIC
# MAGIC ## ⚠️ 危险操作
# MAGIC 本 Notebook 将 **永久删除** 归档数据，操作不可逆。
# MAGIC
# MAGIC ## 执行流程
# MAGIC 1. 校验目标系统状态
# MAGIC 2. DROP 所有 Iceberg 表 (UC 注册)
# MAGIC 3. VACUUM 物理回收存储空间
# MAGIC 4. 清理 ADLS 目录残留文件
# MAGIC 5. DROP UC Schema
# MAGIC 6. 回调通知后端

# COMMAND ----------

# ============================================================
# Widget 参数
# ============================================================
dbutils.widgets.text("system_code", "", "系统编码")
dbutils.widgets.text("uc_catalog", "lake", "Unity Catalog 名")
dbutils.widgets.text("table_list", "", "待销毁表列表(逗号分隔)")
dbutils.widgets.text("target_storage_account", "", "Azure 存储账户名")
dbutils.widgets.text("target_container", "", "ADLS 容器名")
dbutils.widgets.text("target_path_prefix", "archive", "路径前缀")
dbutils.widgets.text("blob_container", "", "附件 Blob 容器名 (可选)")
dbutils.widgets.text("job_id", "", "RIMS 任务ID")
dbutils.widgets.text("callback_url", "", "回调URL")
dbutils.widgets.text("dry_run", "false", "演练模式 (true=只模拟不执行)")

# COMMAND ----------

# ============================================================
# 读取参数
# ============================================================
system_code = dbutils.widgets.get("system_code")
uc_catalog = dbutils.widgets.get("uc_catalog")
table_list = [t.strip() for t in dbutils.widgets.get("table_list").split(",") if t.strip()]
target_storage_account = dbutils.widgets.get("target_storage_account")
target_container = dbutils.widgets.get("target_container")
target_path_prefix = dbutils.widgets.get("target_path_prefix")
blob_container = dbutils.widgets.get("blob_container")
job_id = dbutils.widgets.get("job_id")
callback_url = dbutils.widgets.get("callback_url")
dry_run = dbutils.widgets.get("dry_run").lower() == "true"

uc_schema = system_code
base_adls_path = f"abfss://{target_container}@{target_storage_account}.dfs.core.windows.net/{target_path_prefix}/{system_code}"

print(f"[DESTROY] System: {system_code}")
print(f"[DESTROY] UC: {uc_catalog}.{uc_schema}")
print(f"[DESTROY] Tables: {table_list}")
print(f"[DESTROY] ADLS Path: {base_adls_path}")
print(f"[DESTROY] Dry Run: {dry_run}")

if not system_code:
    raise ValueError("system_code is required!")

# COMMAND ----------

# ============================================================
# 执行销毁
# ============================================================
import time
import json
from datetime import datetime

destroy_results = []
total_start = time.time()

# ---- Phase 1: DROP Iceberg 表 + VACUUM ----
print(f"\n{'='*60}")
print(f"Phase 1: DROP TABLE + VACUUM")
print(f"{'='*60}")

for idx, table_name in enumerate(table_list, 1):
    full_table_name = f"{uc_catalog}.{uc_schema}.{table_name}"
    table_path = f"{base_adls_path}/{table_name}"
    print(f"\n[{idx}/{len(table_list)}] 销毁: {full_table_name}")

    table_start = time.time()

    try:
        if dry_run:
            # 演练模式: 只检查表是否存在
            exists = spark.sql(f"SHOW TABLES IN {uc_catalog}.{uc_schema} LIKE '{table_name}'").count() > 0
            print(f"[DRY RUN] 表 {'存在' if exists else '不存在'}: {full_table_name}")
            destroy_results.append({
                "table": table_name,
                "phase": "DROP+VACUUM",
                "status": "DRY_RUN",
                "exists": exists
            })
        else:
            # 实际销毁: DROP TABLE
            spark.sql(f"DROP TABLE IF EXISTS {full_table_name}")
            print(f"[DROP] 表已删除: {full_table_name}")

            # VACUUM 物理清理 (对底层路径执行)
            try:
                spark.sql(f"VACUUM delta.`{table_path}` RETAIN 0 HOURS")
                print(f"[VACUUM] 物理文件已清理: {table_path}")
            except Exception as vacuum_err:
                # Iceberg 表的 VACUUM 语法可能不同，忽略
                print(f"[VACUUM] 跳过 (Iceberg): {vacuum_err}")

            duration = time.time() - table_start
            destroy_results.append({
                "table": table_name,
                "phase": "DROP+VACUUM",
                "status": "SUCCESS",
                "duration_seconds": round(duration, 2)
            })

    except Exception as e:
        duration = time.time() - table_start
        error_msg = str(e)[:500]
        print(f"[ERROR] 销毁失败: {error_msg}")
        destroy_results.append({
            "table": table_name,
            "phase": "DROP+VACUUM",
            "status": "FAILED",
            "error": error_msg,
            "duration_seconds": round(duration, 2)
        })

# COMMAND ----------

# ---- Phase 2: 清理 ADLS 目录残留 ----
print(f"\n{'='*60}")
print(f"Phase 2: 清理 ADLS 目录残留文件")
print(f"{'='*60}")

try:
    if not dry_run:
        # 使用 Hadoop FileSystem API 删除目录
        fs_path = spark._jvm.org.apache.hadoop.fs.Path(base_adls_path)
        conf = spark._jsc.hadoopConfiguration()
        fs = fs_path.getFileSystem(conf)

        if fs.exists(fs_path):
            fs.delete(fs_path, True)  # recursive=True
            print(f"[CLEAN] ADLS 目录已删除: {base_adls_path}")
        else:
            print(f"[CLEAN] ADLS 目录不存在: {base_adls_path}")

        destroy_results.append({
            "phase": "ADLS_CLEANUP",
            "status": "SUCCESS",
            "path": base_adls_path
        })
    else:
        print(f"[DRY RUN] 将删除目录: {base_adls_path}")
        destroy_results.append({"phase": "ADLS_CLEANUP", "status": "DRY_RUN"})

except Exception as e:
    error_msg = str(e)[:500]
    print(f"[ERROR] ADLS 清理失败: {error_msg}")
    destroy_results.append({"phase": "ADLS_CLEANUP", "status": "FAILED", "error": error_msg})

# COMMAND ----------

# ---- Phase 3: DROP UC Schema ----
print(f"\n{'='*60}")
print(f"Phase 3: 清理 Unity Catalog Schema")
print(f"{'='*60}")

try:
    if not dry_run:
        spark.sql(f"DROP SCHEMA IF EXISTS {uc_catalog}.{uc_schema} CASCADE")
        print(f"[UC] Schema 已删除: {uc_catalog}.{uc_schema}")
        destroy_results.append({"phase": "UC_SCHEMA_DROP", "status": "SUCCESS"})
    else:
        print(f"[DRY RUN] 将删除 Schema: {uc_catalog}.{uc_schema}")
        destroy_results.append({"phase": "UC_SCHEMA_DROP", "status": "DRY_RUN"})

except Exception as e:
    error_msg = str(e)[:500]
    print(f"[ERROR] UC Schema 删除失败: {error_msg}")
    destroy_results.append({"phase": "UC_SCHEMA_DROP", "status": "FAILED", "error": error_msg})

# COMMAND ----------

# ============================================================
# 汇总结果
# ============================================================
total_duration = time.time() - total_start
success_count = sum(1 for r in destroy_results if r["status"] in ("SUCCESS", "DRY_RUN"))
failed_count = sum(1 for r in destroy_results if r["status"] == "FAILED")

summary = {
    "job_id": job_id,
    "system_code": system_code,
    "dry_run": dry_run,
    "total_operations": len(destroy_results),
    "success_count": success_count,
    "failed_count": failed_count,
    "total_duration_seconds": round(total_duration, 2),
    "results": destroy_results,
    "completed_at": datetime.now().isoformat()
}

print(f"\n{'='*60}")
print(f"[DESTROY SUMMARY] {json.dumps(summary, indent=2, ensure_ascii=False)}")
print(f"{'='*60}")

# 回调
if callback_url and not dry_run:
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

dbutils.notebook.exit(json.dumps(summary))
