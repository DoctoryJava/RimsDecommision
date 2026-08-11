package com.rims.decommission.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.rims.decommission.entity.RAuditLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface RAuditLogMapper extends BaseMapper<RAuditLog> {
}
