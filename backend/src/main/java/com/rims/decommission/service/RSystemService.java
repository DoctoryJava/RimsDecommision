package com.rims.decommission.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.entity.RSystem;

import java.util.List;

public interface RSystemService {
    IPage<RSystem> page(Page<RSystem> page, String search, String stage);
    RSystem getById(String id);
    RSystem create(RSystem system);
    RSystem update(String id, RSystem system);
    boolean delete(String id);
    List<RSystem> listAll();
}
