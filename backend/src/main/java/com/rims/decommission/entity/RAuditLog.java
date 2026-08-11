package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

/** r_audit_log 表 —— 审计日志（SQL 查询 / ETL 任务）。 */
@Data
@TableName(value = "r_audit_log", autoResultMap = true)
public class RAuditLog {
    @TableId
    private String id;
    private String operator;
    private String actionType;
    private String sqlText;
    private String status;
    private String systemId;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> detail;
    private LocalDateTime executedAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
