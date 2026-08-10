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

/** r_drill_config 表 —— 查询配置的关联明细下钻配置。 */
@Data
@TableName(value = "r_drill_config", autoResultMap = true)
public class RDrillConfig {
    @TableId
    private String id;
    private String queryConfigId;
    private String parentId;
    private String name;
    private String baseTable;
    private String parentField;
    private String childField;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Map<String, Object>> fields;
    private Integer sortOrder;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
