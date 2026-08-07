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
 * r_sync_job 表 —— 同步任务（替代 MockStore.syncJobs）。
 */
@Data
@TableName(value = "r_sync_job", autoResultMap = true)
public class RSyncJob {
    @TableId
    private String id;
    private String systemId;
    private String systemName;
    private String type;
    private String status;
    private String startedAt;
    private String duration;
    private Long records;
    private String triggeredBy;
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<Map<String, Object>> logs;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
