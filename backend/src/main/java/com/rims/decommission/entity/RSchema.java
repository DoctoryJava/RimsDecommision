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
 * r_schema 表 —— Schema 注册（替代 MockStore.schemas）。
 */
@Data
@TableName(value = "r_schema", autoResultMap = true)
public class RSchema {
    @TableId
    private String id;
    private String systemId;
    private String name;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Map<String, Object>> tables;
    private String syncedAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
