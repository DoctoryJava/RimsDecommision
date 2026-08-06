package com.rims.decommission.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.entity.DecommSystem;

public interface DecommSystemService {
    IPage<DecommSystem> page(Page<DecommSystem> page, String search, String stage);
    DecommSystem getById(Long id);
    DecommSystem create(DecommSystem system);
    DecommSystem update(Long id, DecommSystem system);
    boolean delete(Long id);
}
