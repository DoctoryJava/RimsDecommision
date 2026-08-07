package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 对应 r_unstructured_item 表 */
@Data
@TableName("r_unstructured_item")
public class RUnstructuredItem {
    @TableId
    private String id;
    private String unstructuredSourceId;
    private String originalPath;
    private String originalName;
    private Long sizeBytes;
    private String contentType;
    private LocalDateTime lastModified;
    private LocalDate derivedDate;
    private String hash;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
