package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * r_query_config 表 —— 查询配置（替代 MockStore.queryConfigs）。
 */
@Data
@TableName(value = "r_query_config", autoResultMap = true)
public class RQueryConfig {
    @TableId
    private String id;
    private String name;
    private String description;
    private String baseTable;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Map<String, Object>> joins;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Map<String, Object>> fields;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> defaultSort;
    private Integer pageSize;
    private String status;
    private String createdBy;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
