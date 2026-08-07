package com.rims.decommission.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.entity.RUser;

public interface RUserService {
    IPage<RUser> page(Page<RUser> page, String search, String role);
    RUser getById(String id);
    RUser create(RUser user);
    RUser update(String id, RUser user);
    boolean delete(String id);
}
