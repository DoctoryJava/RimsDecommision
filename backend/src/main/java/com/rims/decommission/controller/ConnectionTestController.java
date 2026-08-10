package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.service.DatabaseConnectionTester;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * 数据库连接测试（按表单参数）。
 * 由 Init Config 的 Test Connection 调用。
 */
@RestController
@RequestMapping("/api/systems")
@Tag(name = "连接测试")
public class ConnectionTestController {

    private final DatabaseConnectionTester tester;

    public ConnectionTestController(DatabaseConnectionTester tester) {
        this.tester = tester;
    }

    @PostMapping("/test-connection")
    @Operation(summary = "测试数据库连接", description = "后端根据 engine/host/port/database/username/password 尝试建立 JDBC 连接")
    public Result<Map<String, Object>> testConnection(@RequestBody Map<String, Object> body) {
        String engine = body.get("engine") == null ? "mysql" : String.valueOf(body.get("engine"));
        String host = body.get("host") == null ? "" : String.valueOf(body.get("host"));
        String database = body.get("database") == null ? "" : String.valueOf(body.get("database"));
        String username = body.get("username") == null ? "" : String.valueOf(body.get("username"));
        String password = body.get("password") == null ? "" : String.valueOf(body.get("password"));
        int port = body.get("port") instanceof Number n ? n.intValue() : 0;
        boolean ssl = body.get("ssl") instanceof Boolean b ? b : false;
        try {
            return Result.success(tester.test(engine, host, port, database, username, password, ssl));
        } catch (Exception e) {
            return Result.fail(400, e.getMessage() == null ? "连接失败" : e.getMessage());
        }
    }
}
