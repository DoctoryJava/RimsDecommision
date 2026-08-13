package com.rims.spark;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

/**
 * 独立 Spark SQL 查询作业，由后端 SparkQueryService 通过 spark-submit 调用。
 * 读取已同步落盘的 Iceberg 数据，执行任意 SQL（SELECT / WHERE / JOIN / 聚合），
 * 结果以 RESULT_ 前缀行输出到 stdout，便于后端在 Spark 海量日志中精确解析。
 *
 * <p>用法： spark-submit --master local[1] --jars iceberg-spark-runtime-3.3_2.12-1.4.3.jar
 * --class com.rims.spark.QueryJob &lt;this.jar&gt; &lt;warehouse&gt; &lt;catalogName&gt; &lt;sql&gt;
 *
 * <p>编译期仅依赖 Spark（org.apache.spark.sql.*），不 import Iceberg 类 —— Iceberg runtime 由
 * spark-submit --jars 在运行期注入。因此 javac -cp $SPARK_HOME/jars/* 即可编译。
 *
 * <p>输出协议： <ul>
 *   <li>{@code RESULT_COLUMNS:}<i>col1\tcol2...</i> —— 列名（tab 分隔）</li>
 *   <li>{@code RESULT_ROW:}<i>{json}</i> —— 一行数据（Spark toJSON 生成的 JSON）</li>
 *   <li>{@code RESULT_COUNT:}<i>n</i> —— 本次返回行数</li>
 *   <li>{@code RESULT_ERROR:}<i>msg</i> —— 查询异常（单行）</li>
 * </ul>
 */
public class QueryJob {

    public static void main(String[] args) {
        if (args.length < 3) {
            System.err.println("RESULT_ERROR: usage: <warehouse> <catalogName> <sql>");
            System.exit(2);
        }
        String warehouse = args[0];
        String catalogName = args[1];
        String sql = args[2];

        // Iceberg hadoop catalog：warehouse 指向本地数据根目录，namespace 对应子目录层级
        // （如 warehouse=/.../archive，表 mi.archive.l_organization → /.../archive/mi/archive/l_organization）。
        // 设 defaultCatalog 后，SQL 可省略 catalog 前缀，直接写 namespace.table。
        SparkSession spark = SparkSession.builder()
                .appName("rims-query")
                .config("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
                .config("spark.sql.catalog." + catalogName, "org.apache.iceberg.spark.SparkCatalog")
                .config("spark.sql.catalog." + catalogName + ".type", "hadoop")
                .config("spark.sql.catalog." + catalogName + ".warehouse", "file://" + warehouse)
                .config("spark.sql.defaultCatalog", catalogName)
                .config("spark.sql.session.timeZone", "UTC")
                .getOrCreate();

        try {
            Dataset<Row> df = spark.sql(sql);
            String[] columns = df.columns();
            System.out.println("RESULT_COLUMNS:" + String.join("\t", columns));

            String[] rows = (String[]) df.toJSON().collect();
            for (String row : rows) {
                System.out.println("RESULT_ROW:" + row);
            }
            System.out.println("RESULT_COUNT:" + rows.length);
        } catch (Exception e) {
            String msg = e.getMessage() == null ? e.toString() : e.getMessage();
            System.out.println("RESULT_ERROR:" + msg.replace("\n", " ").replace("\r", " "));
        } finally {
            spark.stop();
        }
    }
}
