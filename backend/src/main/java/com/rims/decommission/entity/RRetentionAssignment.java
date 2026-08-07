package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 对应 r_retention_assignment 表 */
@Data
@TableName("r_retention_assignment")
public class RRetentionAssignment {
    @TableId
    private String id;
    private String policyId;
    private String objectType;
    private String objectId;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String status;
    private LocalDateTime currentHoldStart;
    private LocalDateTime currentHoldEnd;
    private String assignedBy;
    private LocalDateTime createdOn;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
