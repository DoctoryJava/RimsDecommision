package com.rims.decommission.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.entity.DecommSystem;
import com.rims.decommission.mapper.DecommSystemMapper;
import com.rims.decommission.service.DecommSystemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class DecommSystemServiceImpl implements DecommSystemService {

    private final DecommSystemMapper mapper;

    @Override
    public IPage<DecommSystem> page(Page<DecommSystem> page, String search, String stage) {
        LambdaQueryWrapper<DecommSystem> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(search)) {
            w.like(DecommSystem::getSystemName, search).or().like(DecommSystem::getSystemCode, search);
        }
        if (StringUtils.hasText(stage) && !"all".equals(stage)) {
            w.eq(DecommSystem::getStatus, stage);
        }
        w.orderByDesc(DecommSystem::getCreatedAt);
        return mapper.selectPage(page, w);
    }

    @Override
    public DecommSystem getById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public DecommSystem create(DecommSystem system) {
        if (system.getStatus() == null) system.setStatus("REGISTERED");
        if (system.getRetentionYears() == null) system.setRetentionYears(7);
        mapper.insert(system);
        return system;
    }

    @Override
    public DecommSystem update(Long id, DecommSystem system) {
        system.setId(id);
        mapper.updateById(system);
        return mapper.selectById(id);
    }

    @Override
    public boolean delete(Long id) {
        return mapper.deleteById(id) > 0;
    }
}
