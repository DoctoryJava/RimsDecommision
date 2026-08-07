package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 对应 r_archive_set_item 表 */
@Data
@TableName("r_archive_set_item")
public class RArchiveSetItem {
    @TableId
    private String id;
    private String archiveSetId;
    private String originalPath;
    private String originalName;
    private String blobUrl;
    private Long sizeBytes;
    private String checksum;
    private String contentType;
    private LocalDateTime copiedAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
