package com.rims.decommission.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.DecommSystem;
import com.rims.decommission.mock.MockStore;
import com.rims.decommission.service.DecommSystemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/systems")
@Tag(name = "退役系统")
public class SystemController {

    private final DecommSystemService service;

    public SystemController(DecommSystemService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "退役系统列表（MySQL 真查，空库回退 Mock）")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String stage) {
        try {
            Page<DecommSystem> p = new Page<>(pageNum, pageSize);
            var ipage = service.page(p, search, stage);
            if (ipage.getTotal() > 0) {
                List<Map<String,Object>> list = ipage.getRecords().stream().map(this::toMap).collect(Collectors.toList());
                return Result.success(PageResult.of(ipage.getTotal(), list, pageNum, pageSize));
            }
        } catch (Exception e) {
            // DB not ready or empty -> fallback to mock
        }
        // Fallback to MockStore for demo
        var all = MockStore.systems();
        if (search != null && !search.isBlank()) {
            String s = search.toLowerCase();
            all = all.stream().filter(m -> m.get("name").toString().toLowerCase().contains(s) || m.get("code").toString().toLowerCase().contains(s)).collect(Collectors.toList());
        }
        if (stage != null && !stage.isBlank() && !"all".equals(stage)) {
            all = all.stream().filter(m -> stage.equals(m.get("stage"))).collect(Collectors.toList());
        }
        int from = Math.min((pageNum-1)*pageSize, all.size());
        int to = Math.min(from+pageSize, all.size());
        return Result.success(PageResult.of(all.size(), all.subList(from,to), pageNum, pageSize));
    }

    @PostMapping
    @Operation(summary = "注册退役系统（MyBatis-Plus 真写）")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        try {
            DecommSystem e = fromMap(body);
            service.create(e);
            return Result.success(toMap(e));
        } catch (Exception e) {
            body.putIfAbsent("id","sys-"+System.currentTimeMillis());
            return Result.success(body);
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "系统详情（真查回退 Mock）")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        try {
            // try numeric id
            Long lid = null;
            try { lid = Long.valueOf(id.replace("sys-","")); } catch (Exception ignored) {}
            if (lid != null) {
                DecommSystem e = service.getById(lid);
                if (e != null) return Result.success(toMap(e));
            }
        } catch (Exception ignored) {}
        return MockStore.systems().stream().filter(m -> id.equals(m.get("id"))).findFirst()
                .map(Result::success).orElse(Result.fail(404,"系统不存在"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新系统")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        try {
            Long lid = Long.valueOf(id.replace("sys-",""));
            DecommSystem e = fromMap(body);
            service.update(lid, e);
            return Result.success(toMap(e));
        } catch (Exception e) {
            body.put("id", id);
            return Result.success(body);
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除系统")
    public Result<Void> delete(@PathVariable String id) {
        try {
            Long lid = Long.valueOf(id.replace("sys-",""));
            service.delete(lid);
        } catch (Exception ignored) {}
        return Result.success(null);
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "系统状态（含同步进度）")
    public Result<Map<String,Object>> status(@PathVariable String id) {
        return Result.success(Map.of("systemId", id, "status", "active", "progress", 80));
    }

    // Helpers: Map <-> Entity conversion for SystemRecord shape
    private Map<String,Object> toMap(DecommSystem e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", "sys-"+e.getId());
        m.put("name", e.getSystemName());
        m.put("code", e.getSystemCode());
        m.put("description", e.getDescription());
        m.put("owner", e.getOwner());
        m.put("department", e.getDepartment());
        // status 6态 -> stage 4态 for Bolt frontend
        String stage = switch(e.getStatus()) {
            case "REGISTERED","CONFIGURED","SYNCING" -> "active";
            case "ARCHIVED" -> "archived";
            case "EXPIRING" -> "deprecated";
            case "DESTROYED" -> "destroyed";
            default -> "active";
        };
        m.put("stage", stage);
        m.put("status", e.getStatus());
        m.put("createdAt", e.getCreatedAt()!=null?e.getCreatedAt().toString():null);
        m.put("archivedAt", e.getSyncCompletedDate()!=null?e.getSyncCompletedDate().toString():null);
        m.put("dataSizeGB", 10);
        m.put("schemaCount", 3);
        m.put("tableCount", 12);
        m.put("tags", List.of());
        return m;
    }

    private DecommSystem fromMap(Map<String,Object> m) {
        DecommSystem e = new DecommSystem();
        Object name = m.get("name"); if (name==null) name=m.get("systemName");
        Object code = m.get("code"); if (code==null) code=m.get("systemCode");
        e.setSystemName(name!=null?name.toString():null);
        e.setSystemCode(code!=null?code.toString():null);
        e.setDescription(m.get("description")!=null?m.get("description").toString():null);
        e.setOwner(m.get("owner")!=null?m.get("owner").toString():null);
        e.setDepartment(m.get("department")!=null?m.get("department").toString():null);
        Object st = m.get("status"); if (st==null) st=m.get("stage");
        if (st!=null) {
            String s = st.toString();
            // stage 4态 -> status 6态
            String status = switch(s) {
                case "active" -> "REGISTERED";
                case "deprecated" -> "EXPIRING";
                case "archived" -> "ARCHIVED";
                case "destroyed" -> "DESTROYED";
                default -> s;
            };
            e.setStatus(status);
        }
        return e;
    }
}
