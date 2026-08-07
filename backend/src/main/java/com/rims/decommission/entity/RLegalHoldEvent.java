package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 对应 r_legal_hold_event 表 */
@Data
@TableName("r_legal_hold_event")
public class RLegalHoldEvent {
    @TableId
    private String id;
    private String assignmentId;
    private String action;
    private LocalDateTime holdStart;
    private LocalDateTime holdEnd;
    private String reason;
    private String actorId;
    private LocalDateTime ts;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
