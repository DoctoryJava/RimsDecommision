package com.rims.decommission.service;

import org.springframework.stereotype.Service;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import java.util.Properties;

/**
 * 数据库连接测试逻辑。封装 JDBC 建连与校验，供不同入口复用
 * （System Init Config、Data Sources 逐库测试）。
 */
@Service
public class DatabaseConnectionTester {

    public Map<String, Object> test(String engine, String host, int port, String database,
                                    String username, String password, boolean ssl) {
        String e = engine == null ? "mysql" : engine.toLowerCase();
        if (host == null || host.isBlank()) throw new IllegalArgumentException("服务器地址(Host)不能为空");
        if (database == null || database.isBlank()) throw new IllegalArgumentException("数据库名(Database)不能为空");
        if (username == null || username.isBlank()) throw new IllegalArgumentException("用户名(Username)不能为空");

        String url = buildJdbcUrl(e, host, port, database, ssl);
        if (url == null) {
            throw new IllegalArgumentException("暂不支持或未安装 " + e + " 的驱动，请确认后端已引入对应 JDBC 驱动");
        }

        Properties props = new Properties();
        props.setProperty("user", username);
        if (password != null) props.setProperty("password", password);
        props.setProperty("loginTimeout", "5");
        if ("mysql".equals(e)) {
            props.setProperty("connectTimeout", "5000");
            props.setProperty("socketTimeout", "5000");
        }

        try (Connection conn = DriverManager.getConnection(url, props)) {
            boolean valid = conn.isValid(5);
            if (!valid) throw new SQLException("连接建立但有效性校验失败");
            return Map.<String, Object>of("connected", true, "message", "连接成功");
        } catch (SQLException ex) {
            String msg = ex.getMessage() == null ? "连接失败" : ex.getMessage();
            throw new IllegalStateException("连接失败：" + sanitize(msg), ex);
        } catch (Exception ex) {
            throw new IllegalStateException("连接失败：" + sanitize(ex.getMessage()), ex);
        }
    }

    private String buildJdbcUrl(String engine, String host, int port, String database, boolean ssl) {
        switch (engine) {
            case "mysql":
                return "jdbc:mysql://" + host + ":" + port + "/" + database
                        + "?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai"
                        + "&allowPublicKeyRetrieval=true&useSSL=" + ssl
                        + "&connectTimeout=5000&socketTimeout=5000";
            case "postgresql":
                return "jdbc:postgresql://" + host + ":" + port + "/" + database;
            case "sqlserver":
                return "jdbc:sqlserver://" + host + ":" + port + ";databaseName=" + database
                        + ";encrypt=" + (ssl ? "true" : "false") + ";trustServerCertificate=true";
            case "oracle":
                return "jdbc:oracle:thin:@//" + host + ":" + port + "/" + database;
            default:
                return null;
        }
    }

    private String sanitize(String msg) {
        if (msg == null) return "未知错误";
        return msg.replaceAll("(?i)password=[^\\s;]*", "password=***")
                .replaceAll("(?i)user=[^\\s;]*", "user=***")
                .replaceAll("(?i)pwd=[^\\s;]*", "pwd=***");
    }
}
