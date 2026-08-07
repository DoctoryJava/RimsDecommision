package com.rims.decommission.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.entity.RUser;
import com.rims.decommission.mapper.RUserMapper;
import com.rims.decommission.service.RUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class RUserServiceImpl implements RUserService {

    private final RUserMapper mapper;
    private final PasswordEncoder encoder;

    @Override
    public IPage<RUser> page(Page<RUser> page, String search, String role) {
        LambdaQueryWrapper<RUser> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(search)) {
            w.and(x -> x.like(RUser::getName, search).or().like(RUser::getEmail, search));
        }
        if (StringUtils.hasText(role)) {
            w.eq(RUser::getRoleCode, role);
        }
        w.orderByAsc(RUser::getId);
        return mapper.selectPage(page, w);
    }

    @Override
    public RUser getById(String id) {
        return mapper.selectById(id);
    }

    @Override
    public RUser create(RUser user) {
        if (user.getId() == null || user.getId().isBlank()) {
            user.setId("u-" + System.currentTimeMillis());
        }
        if (user.getStatus() == null) user.setStatus("active");
        if (StringUtils.hasText(user.getPassword())) {
            user.setPassword(encoder.encode(user.getPassword()));
        }
        mapper.insert(user);
        return mapper.selectById(user.getId());
    }

    @Override
    public RUser update(String id, RUser user) {
        user.setId(id);
        if (StringUtils.hasText(user.getPassword())) {
            user.setPassword(encoder.encode(user.getPassword()));
        }
        mapper.updateById(user);
        return mapper.selectById(id);
    }

    @Override
    public boolean delete(String id) {
        return mapper.deleteById(id) > 0;
    }
}
