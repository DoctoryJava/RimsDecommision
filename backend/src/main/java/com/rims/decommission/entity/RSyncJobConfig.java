package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** r_sync_job_config 表 —— 定时同步 Job 配置。 */
@Data
@TableName("r_sync_job_config")
public class RSyncJobConfig {
    @TableId
    private String id;
    private String systemId;
    private String jobName;
    private String cronExpr;
    private Integer enabled;
    private LocalDateTime lastRunAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
