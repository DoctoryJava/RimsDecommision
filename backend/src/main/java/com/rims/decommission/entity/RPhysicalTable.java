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
 * r_physical_table 表 —— 物理表元数据（替代 MockStore.physicalTables）。
 */
@Data
@TableName(value = "r_physical_table", autoResultMap = true)
public class RPhysicalTable {
    @TableId
    private String id;
    private String name;
    private String label;
    private String systemId;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Map<String, Object>> columns;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Map<String, Object>> rows;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
