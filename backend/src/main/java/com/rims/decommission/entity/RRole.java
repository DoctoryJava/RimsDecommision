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

/**
 * r_role 表 —— 角色（替代 MockStore.roles）。
 */
@Data
@TableName(value = "r_role", autoResultMap = true)
public class RRole {
    @TableId
    private String id;
    private String roleKey;
    private String name;
    private String description;
    private Integer userCount;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> permissions;
    private String category;
    private String color;
    private Integer isBuiltin;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
