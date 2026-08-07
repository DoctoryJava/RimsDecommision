package com.rims.decommission.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.entity.RSystem;
import com.rims.decommission.mapper.RSystemMapper;
import com.rims.decommission.service.RSystemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RSystemServiceImpl implements RSystemService {

    private final RSystemMapper mapper;

    @Override
    public IPage<RSystem> page(Page<RSystem> page, String search, String stage) {
        LambdaQueryWrapper<RSystem> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(search)) {
            w.and(x -> x.like(RSystem::getName, search).or().like(RSystem::getCode, search));
        }
        if (StringUtils.hasText(stage) && !"all".equals(stage)) {
            w.eq(RSystem::getStage, stage);
        }
        w.orderByAsc(RSystem::getId);
        return mapper.selectPage(page, w);
    }

    @Override
    public RSystem getById(String id) {
        return mapper.selectById(id);
    }

    @Override
    public RSystem create(RSystem system) {
        if (system.getId() == null || system.getId().isBlank()) {
            system.setId("sys-" + System.currentTimeMillis());
        }
        if (system.getStage() == null) system.setStage("active");
        if (system.getStatus() == null) system.setStatus("REGISTERED");
        mapper.insert(system);
        return mapper.selectById(system.getId());
    }

    @Override
    public RSystem update(String id, RSystem system) {
        system.setId(id);
        mapper.updateById(system);
        return mapper.selectById(id);
    }

    @Override
    public boolean delete(String id) {
        return mapper.deleteById(id) > 0;
    }

    @Override
    public List<RSystem> listAll() {
        return mapper.selectList(null);
    }
}
