package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** r_sync_table_config 表 —— 同步前表级配置（表选择 + 生命周期保留策略）。 */
@Data
@TableName("r_sync_table_config")
public class RSyncTableConfig {
    @TableId
    private String id;
    private String systemId;
    private String sourceDatabaseId;
    private String tableName;
    private Integer enabled;
    private String dateColumn;
    private Integer retainYears;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
