package com.rims.decommission.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * SeaTunnel 同步引擎配置（读取 application.yml 的 app.seatunnel.*）。
 */
@Component
@ConfigurationProperties(prefix = "app.seatunnel")
public class SeaTunnelProperties {
    /** SeaTunnel 安装目录（含 bin/seatunnel.sh） */
    private String home = "/opt/seatunnel";
    /** 本地磁盘 Iceberg warehouse 根路径（模拟存储桶） */
    private String warehouseDir = "/data/archive";
    /** 生成的 .conf 临时目录 */
    private String confDir = "/data/archive/.conf";
    /** 是否真正调用 SeaTunnel（false 时模拟成功，便于无环境调试） */
    private boolean enabled = false;

    public String getHome() { return home; }
    public void setHome(String home) { this.home = home; }
    public String getWarehouseDir() { return warehouseDir; }
    public void setWarehouseDir(String warehouseDir) { this.warehouseDir = warehouseDir; }
    public String getConfDir() { return confDir; }
    public void setConfDir(String confDir) { this.confDir = confDir; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
