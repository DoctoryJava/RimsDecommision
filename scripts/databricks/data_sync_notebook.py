# Databricks 数据同步 Notebook 模板
# 用于从源数据库读取数据并写入 Azure Blob Storage (Delta/Parquet 格式)
# 此脚本由 RIMS Decommission 后端通过 Databricks SDK 提交执行

# ============================================================
# 参数 (由后端在提交 Job 时注入)
# ============================================================
dbutils.widgets.text("source_db_type", "MYSQL", "源数据库类型")
dbutils.widgets.text("source_host", "", "源数据库地址")
dbutils.widgets.text("source_port", "3306", "源数据库端口")
dbutils.widgets.text("source_database", "", "源数据库名")
dbutils.widgets.text("source_schema", "", "源 Schema")
dbutils.widgets.text("source_username", "", "源数据库用户名")
dbutils.widgets.text("source_password", "", "源数据库密码")
dbutils.widgets.text("source_tables", "", "同步表列表(逗号分隔)")
dbutils.widgets.text("target_storage_account", "", "Azure 存储账户名")
dbutils.widgets.text("target_container", "", "目标容器名")
dbutils.widgets.text("target_path_prefix", "", "目标路径前缀")
dbutils.widgets.text("target_format", "DELTA", "目标格式: DELTA/PARQUET/CSV")
dbutils.widgets.text("target_compression", "SNAPPY", "压缩方式")
dbutils.widgets.text("system_code", "", "系统编码")
dbutils.widgets.text("job_id", "", "任务ID")
dbutils.widgets.text("callback_url", "", "回调URL")

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
source_tables = dbutils.widgets.get("source_tables").split(",")
target_storage_account = dbutils.widgets.get("target_storage_account")
target_container = dbutils.widgets.get("target_container")
target_path_prefix = dbutils.widgets.get("target_path_prefix")
target_format = dbutils.widgets.get("target_format")
target_compression = dbutils.widgets.get("target_compression")
system_code = dbutils.widgets.get("system_code")
job_id = dbutils.widgets.get("job_id")
callback_url = dbutils.widgets.get("callback_url")

# ============================================================
# 构建 JDBC URL
# ============================================================
jdbc_urls = {
    "MYSQL": f"jdbc:mysql://{source_host}:{source_port}/{source_database}?useSSL=false&allowPublicKeyRetrieval=true",
    "POSTGRESQL": f"jdbc:postgresql://{source_host}:{source_port}/{source_database}",
    "ORACLE": f"jdbc:oracle:thin:@{source_host}:{source_port}:{source_database}",
    "SQLSERVER": f"jdbc:sqlserver://{source_host}:{source_port};databaseName={source_database}"
}

jdbc_url = jdbc_urls.get(source_db_type.upper())
jdbc_driver = {
    "MYSQL": "com.mysql.cj.jdbc.Driver",
    "POSTGRESQL": "org.postgresql.Driver",
    "ORACLE": "oracle.jdbc.OracleDriver",
    "SQLSERVER": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
}.get(source_db_type.upper())

# ============================================================
# 配置 Azure Blob Storage 访问
# ============================================================
spark.conf.set(
    f"fs.azure.account.auth.type.{target_storage_account}.dfs.core.windows.net",
    "SharedKey"
)

# 目标路径
base_target_path = f"wasbs://{target_container}@{target_storage_account}.blob.core.windows.net/{target_path_prefix}/{system_code}"

# ============================================================
# 数据同步逻辑
# ============================================================
import time
import json
from datetime import datetime

sync_results = []

for table_name in source_tables:
    table_name = table_name.strip()
    if not table_name:
        continue
    
    print(f"[INFO] 开始同步表: {table_name}")
    start_time = time.time()
    
    try:
        # 从源数据库读取
        df = (spark.read
              .format("jdbc")
              .option("url", jdbc_url)
              .option("driver", jdbc_driver)
              .option("dbtable", table_name)
              .option("user", source_username)
              .option("password", source_password)
              .option("fetchsize", "10000")
              .option("numPartitions", "4")
              .load())
        
        row_count = df.count()
        print(f"[INFO] 表 {table_name}: 读取 {row_count} 行")
        
        # 构建目标路径
        target_path = f"{base_target_path}/{table_name}"
        
        # 写入目标存储
        writer = df.write.mode("overwrite")
        
        if target_format == "DELTA":
            writer.format("delta").save(target_path)
        elif target_format == "PARQUET":
            writer.format("parquet").option("compression", target_compression.lower()).save(target_path)
        elif target_format == "CSV":
            writer.format("csv").option("header", "true").option("compression", target_compression.lower()).save(target_path)
        
        duration = time.time() - start_time
        print(f"[SUCCESS] 表 {table_name}: 同步完成, 耗时 {duration:.2f}s")
        
        sync_results.append({
            "table": table_name,
            "status": "SUCCESS",
            "rows": row_count,
            "duration_seconds": round(duration, 2)
        })
        
    except Exception as e:
        duration = time.time() - start_time
        error_msg = str(e)
        print(f"[ERROR] 表 {table_name}: 同步失败 - {error_msg}")
        
        sync_results.append({
            "table": table_name,
            "status": "FAILED",
            "error": error_msg,
            "duration_seconds": round(duration, 2)
        })

# ============================================================
# 输出汇总结果
# ============================================================
total_rows = sum(r.get("rows", 0) for r in sync_results)
success_count = sum(1 for r in sync_results if r["status"] == "SUCCESS")
failed_count = sum(1 for r in sync_results if r["status"] == "FAILED")

summary = {
    "job_id": job_id,
    "system_code": system_code,
    "total_tables": len(sync_results),
    "success_count": success_count,
    "failed_count": failed_count,
    "total_rows": total_rows,
    "results": sync_results,
    "completed_at": datetime.now().isoformat()
}

print(f"\n[SUMMARY] {json.dumps(summary, indent=2)}")

# 将结果写入 dbutils notebook output
dbutils.notebook.exit(json.dumps(summary))
