package com.rims.decommission.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Spark 查询引擎配置（读取 application.yml 的 app.spark.*）。
 */
@Component
@ConfigurationProperties(prefix = "app.spark")
public class SparkProperties {
    /** Spark 安装目录 */
    private String home = "/Users/chenyong/Desktop/BigData/spark-3.3.4-bin-hadoop3";
    /** Iceberg 落盘 warehouse 根路径（读已同步数据） */
    private String warehouseDir = "/Users/chenyong/Desktop/BigData/archive";
    /** Iceberg spark runtime 依赖坐标 */
    private String icebergPackage = "org.apache.iceberg:iceberg-spark-runtime-3.3_2.12:1.4.3";
    /** 是否真正调用 Spark（false 时返回模拟数据） */
    private boolean enabled = true;
    /** Iceberg spark runtime jar 本地路径（spark-submit --jars 注入，运行期类由 Iceberg 提供） */
    private String icebergJar = "/Users/chenyong/.ivy2/cache/org.apache.iceberg/iceberg-spark-runtime-3.3_2.12/jars/iceberg-spark-runtime-3.3_2.12-1.4.3.jar";
    /** 独立 Spark SQL 查询作业 jar（scripts/spark/rims-spark-query.jar，含 com.rims.spark.QueryJob） */
    private String queryJobJar = "/Users/chenyong/Desktop/LLM-AI/RimsDecommision/scripts/spark/rims-spark-query.jar";
    /** Iceberg catalog 名（QueryJob 注册为 defaultCatalog，SQL 可省略 catalog 前缀） */
    private String catalogName = "rims";
    /** SeaTunnel/Spark 子进程专用 JDK 路径（Spark 3.3 需 JDK ≤11；后端运行于 17+，故进程隔离） */
    private String javaHome = "/Library/Java/JavaVirtualMachines/jdk-11.jdk/Contents/Home";

    public String getHome() { return home; }
    public void setHome(String home) { this.home = home; }
    public String getWarehouseDir() { return warehouseDir; }
    public void setWarehouseDir(String warehouseDir) { this.warehouseDir = warehouseDir; }
    public String getIcebergPackage() { return icebergPackage; }
    public void setIcebergPackage(String icebergPackage) { this.icebergPackage = icebergPackage; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getIcebergJar() { return icebergJar; }
    public void setIcebergJar(String icebergJar) { this.icebergJar = icebergJar; }
    public String getQueryJobJar() { return queryJobJar; }
    public void setQueryJobJar(String queryJobJar) { this.queryJobJar = queryJobJar; }
    public String getCatalogName() { return catalogName; }
    public void setCatalogName(String catalogName) { this.catalogName = catalogName; }
    public String getJavaHome() { return javaHome; }
    public void setJavaHome(String javaHome) { this.javaHome = javaHome; }
}
