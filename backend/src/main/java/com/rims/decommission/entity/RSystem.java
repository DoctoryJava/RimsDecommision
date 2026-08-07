package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * r_system 表 —— 退役系统（替代 MockStore.systems）。
 */
@Data
@TableName(value = "r_system", autoResultMap = true)
public class RSystem {
    @TableId
    private String id;
    private String name;
    private String code;
    private String description;
    private String owner;
    private String department;
    private String stage;
    private String status;
    private LocalDate createdAt;
    private LocalDate archivedAt;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> dbConfig;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> storageConfig;
    private String lastSync;
    private String syncStatus;
    private Integer schemaCount;
    private Integer tableCount;
    private Integer dataSizeGb;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> tags;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
