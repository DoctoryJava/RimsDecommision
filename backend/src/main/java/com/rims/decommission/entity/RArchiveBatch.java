package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 对应 r_archive_batch 表 */
@Data
@TableName("r_archive_batch")
public class RArchiveBatch {
    @TableId
    private String id;
    private String archiveJobId;
    private Integer batchYear;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private Long rowsOut;
    private Long bytesOut;
    private String result;
    private String logUrl;
    private String correlationId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
