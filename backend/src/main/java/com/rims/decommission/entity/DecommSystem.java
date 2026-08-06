package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("decomm_system")
public class DecommSystem {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String systemName;
    private String systemCode;
    private String description;
    private String department;
    private String owner;
    private String ownerEmail;
    private String status;
    private Integer retentionYears;
    private LocalDate decommissionDate;
    private LocalDate syncCompletedDate;
    private LocalDate destroyAfterDate;
    private String ucSchemaName;
    private Long createdBy;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
