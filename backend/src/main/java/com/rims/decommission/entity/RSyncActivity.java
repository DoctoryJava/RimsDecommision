package com.rims.decommission.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** r_sync_activity 表 —— 仪表盘同步活跃度。 */
@Data
@TableName("r_sync_activity")
public class RSyncActivity {
    @TableId
    private String id;
    private String dayLabel;
    private LocalDate activityDate;
    private Integer successCount;
    private Integer failedCount;
    private Integer partialCount;
    private Integer runningCount;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
