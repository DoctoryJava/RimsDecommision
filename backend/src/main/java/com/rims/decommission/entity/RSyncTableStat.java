package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** r_sync_table_stat 表 —— 同步任务-表级统计。 */
@Data
@TableName("r_sync_table_stat")
public class RSyncTableStat {
    @TableId
    private String id;
    private String jobId;
    private String systemId;
    private String databaseName;
    private String tableName;
    private Long rowCount;
    private Long sizeBytes;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
