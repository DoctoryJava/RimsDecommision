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
 * r_page 表 —— 页面（替代 MockStore.pages）。
 */
@Data
@TableName(value = "r_page", autoResultMap = true)
public class RPage {
    @TableId
    private String id;
    private String name;
    private String path;
    private String module;
    private String icon;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> visibleTo;
    private Integer sortOrder;
    private Integer enabled;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
