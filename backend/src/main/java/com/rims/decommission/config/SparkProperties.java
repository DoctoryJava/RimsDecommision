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
    /** SeaTunnel 安装目录（用于 start-seatunnel-spark-3-connector-v2.sh 查询） */
    private String seatunnelHome = "/Users/chenyong/Desktop/BigData/apache-seatunnel-2.3.13";

    public String getHome() { return home; }
    public void setHome(String home) { this.home = home; }
    public String getWarehouseDir() { return warehouseDir; }
    public void setWarehouseDir(String warehouseDir) { this.warehouseDir = warehouseDir; }
    public String getIcebergPackage() { return icebergPackage; }
    public void setIcebergPackage(String icebergPackage) { this.icebergPackage = icebergPackage; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getSeatunnelHome() { return seatunnelHome; }
    public void setSeatunnelHome(String seatunnelHome) { this.seatunnelHome = seatunnelHome; }
}
