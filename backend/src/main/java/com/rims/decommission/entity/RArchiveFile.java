package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 对应 r_archive_file 表 */
@Data
@TableName("r_archive_file")
public class RArchiveFile {
    @TableId
    private String id;
    private String archiveBatchId;
    private String schemaName;
    private String tableName;
    private String blobUrl;
    private Long sizeBytes;
    private String checksum;
    private String etag;
    private LocalDateTime createdOn;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
