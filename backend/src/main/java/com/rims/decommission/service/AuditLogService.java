package com.rims.decommission.service;

import com.rims.decommission.entity.RAuditLog;
import com.rims.decommission.mapper.RAuditLogMapper;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

/** 审计日志服务：记录 SQL 查询与 ETL 任务。 */
@Service
public class AuditLogService {

    private final RAuditLogMapper mapper;

    public AuditLogService(RAuditLogMapper mapper) {
        this.mapper = mapper;
    }

    /** 记录一条审计日志。 */
    public void record(String actionType, String sql, String status, String systemId, Map<String, Object> detail) {
        record(actionType, currentOperator(), sql, status, systemId, detail);
    }

    public void record(String actionType, String operator, String sql, String status, String systemId, Map<String, Object> detail) {
        try {
            RAuditLog log = new RAuditLog();
            log.setId("aud-" + System.currentTimeMillis());
            log.setOperator(operator);
            log.setActionType(actionType);
            log.setSqlText(sql);
            log.setStatus(status);
            log.setSystemId(systemId);
            log.setDetail(detail);
            log.setExecutedAt(LocalDateTime.now());
            mapper.insert(log);
        } catch (Exception ignored) {
            // 审计失败不影响主流程
        }
    }

    /** 从当前 Spring Security 上下文取操作人（登录用户名/显示名）。 */
    public String currentOperator() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null) {
                String name = auth.getName();
                if (name != null) {
                    String display = name.contains("@") ? name.split("@")[0] : name;
                    return display.isBlank() ? "system" : display;
                }
            }
        } catch (Exception ignored) {
        }
        return "system";
    }
}
