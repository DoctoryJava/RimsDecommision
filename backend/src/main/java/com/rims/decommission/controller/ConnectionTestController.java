package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import java.util.Properties;

/**
 * 数据库连接测试。
 * 由前端 Test Connection 调用，后端真正去尝试建立 JDBC 连接，
 * 从而判断网络是否连通、账号密码是否正确。
 */
@RestController
@RequestMapping("/api/systems")
@Tag(name = "连接测试")
public class ConnectionTestController {

    @PostMapping("/test-connection")
    @Operation(summary = "测试数据库连接", description = "后端根据 engine/host/port/database/username/password 尝试建立 JDBC 连接")
    public Result<Map<String, Object>> testConnection(@RequestBody Map<String, Object> body) {
        String engine = str(body.get("engine"), "mysql").toLowerCase();
        String host = str(body.get("host"), "");
        String database = str(body.get("database"), "");
        String username = str(body.get("username"), "");
        String password = str(body.get("password"), "");
        int port = body.get("port") instanceof Number n ? n.intValue() : defaultPort(engine);
        boolean ssl = body.get("ssl") instanceof Boolean b ? b : false;

        if (host.isBlank()) return fail("服务器地址(Host)不能为空");
        if (database.isBlank()) return fail("数据库名(Database)不能为空");
        if (username.isBlank()) return fail("用户名(Username)不能为空");

        String url = buildJdbcUrl(engine, host, port, database, ssl);
        if (url == null) {
            return fail("暂不支持或未安装 " + engine + " 的驱动，请确认后端已引入对应 JDBC 驱动");
        }

        Properties props = new Properties();
        props.setProperty("user", username);
        if (password != null) props.setProperty("password", password);
        props.setProperty("connectTimeout", "5000"); // 秒（部分驱动）
        props.setProperty("loginTimeout", "5");

        // 缩短超时（毫秒，MySQL 参数）
        if ("mysql".equals(engine)) {
            props.setProperty("connectTimeout", "5000");
            props.setProperty("socketTimeout", "5000");
        }

        try (Connection conn = DriverManager.getConnection(url, props)) {
            boolean valid = conn.isValid(5);
            if (!valid) return fail("连接建立但有效性校验失败");
            return Result.success(Map.<String, Object>of("connected", true, "message", "连接成功"));
        } catch (SQLException e) {
            String msg = e.getMessage() == null ? "连接失败" : e.getMessage();
            return fail("连接失败：" + sanitize(msg));
        } catch (Exception e) {
            return fail("连接失败：" + sanitize(e.getMessage()));
        }
    }

    private Result<Map<String, Object>> fail(String message) {
        return Result.fail(400, message);
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
                return "jdbc:sqlserver://" + host + ":" + port + ";databaseName=" + database + ";encrypt=" + (ssl ? "true" : "false") + ";trustServerCertificate=true";
            case "oracle":
                return "jdbc:oracle:thin:@//" + host + ":" + port + "/" + database;
            default:
                return null;
        }
    }

    private int defaultPort(String engine) {
        switch (engine) {
            case "mysql": return 3306;
            case "postgresql": return 5432;
            case "sqlserver": return 1433;
            case "oracle": return 1521;
            case "mongodb": return 27017;
            default: return 3306;
        }
    }

    private String str(Object o, String def) {
        return o == null ? def : o.toString();
    }

    /** 去掉敏感信息（密码等）避免回显。 */
    private String sanitize(String msg) {
        if (msg == null) return "未知错误";
        return msg.replaceAll("(?i)password=[^\\s;]*", "password=***")
                .replaceAll("(?i)user=[^\\s;]*", "user=***")
                .replaceAll("(?i)pwd=[^\\s;]*", "pwd=***");
    }
}
