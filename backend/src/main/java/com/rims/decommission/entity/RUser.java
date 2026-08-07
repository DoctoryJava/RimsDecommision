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
 * r_user 表 —— 用户（替代 MockStore.users / MockUserDetailsService）。
 */
@Data
@TableName(value = "r_user", autoResultMap = true)
public class RUser {
    @TableId
    private String id;
    private String name;
    private String email;
    /** 密码（BCrypt），登录校验需要查询，DTO 层不会序列化该字段 */
    private String password;
    private String avatar;
    private String roleCode;
    private String category;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> systemIds;
    private String status;
    private LocalDateTime lastLogin;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
