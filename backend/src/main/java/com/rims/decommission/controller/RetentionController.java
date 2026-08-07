package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RLegalHoldEvent;
import com.rims.decommission.entity.RRetentionAssignment;
import com.rims.decommission.entity.RRetentionPolicy;
import com.rims.decommission.mapper.RLegalHoldEventMapper;
import com.rims.decommission.mapper.RRetentionAssignmentMapper;
import com.rims.decommission.mapper.RRetentionPolicyMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/retention")
@Tag(name = "保留与合规")
public class RetentionController {

    private final RRetentionPolicyMapper policyMapper;
    private final RRetentionAssignmentMapper assignmentMapper;
    private final RLegalHoldEventMapper holdMapper;

    public RetentionController(RRetentionPolicyMapper policyMapper, RRetentionAssignmentMapper assignmentMapper,
                               RLegalHoldEventMapper holdMapper) {
        this.policyMapper = policyMapper;
        this.assignmentMapper = assignmentMapper;
        this.holdMapper = holdMapper;
    }

    // ---- Policies ----
    @GetMapping("/policies")
    @Operation(summary = "保留策略列表")
    public Result<List<Map<String,Object>>> policies() {
        return Result.success(policyMapper.selectList(new LambdaQueryWrapper<RRetentionPolicy>().orderByAsc(RRetentionPolicy::getId))
                .stream().map(this::policyMap).collect(Collectors.toList()));
    }

    @PostMapping("/policies")
    public Result<Map<String,Object>> createPolicy(@RequestBody Map<String,Object> body) {
        RRetentionPolicy e = policyFromMap(body);
        if (e.getId() == null || e.getId().isBlank()) e.setId("rp-" + System.currentTimeMillis());
        if (e.getCreatedOn() == null) e.setCreatedOn(LocalDateTime.now());
        policyMapper.insert(e);
        return Result.success(policyMap(policyMapper.selectById(e.getId())));
    }

    @PutMapping("/policies/{id}")
    public Result<Map<String,Object>> updatePolicy(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RRetentionPolicy e = policyFromMap(body);
        e.setId(id);
        policyMapper.updateById(e);
        return Result.success(policyMap(policyMapper.selectById(id)));
    }

    @DeleteMapping("/policies/{id}")
    public Result<Void> deletePolicy(@PathVariable String id) {
        policyMapper.deleteById(id);
        return Result.success(null);
    }

    // ---- Assignments ----
    @GetMapping("/assignments")
    @Operation(summary = "保留指派列表")
    public Result<List<Map<String,Object>>> assignments(
            @RequestParam(required=false) String policyId,
            @RequestParam(required=false) String status) {
        LambdaQueryWrapper<RRetentionAssignment> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(policyId)) w.eq(RRetentionAssignment::getPolicyId, policyId);
        if (StringUtils.hasText(status)) w.eq(RRetentionAssignment::getStatus, status);
        w.orderByAsc(RRetentionAssignment::getId);
        return Result.success(assignmentMapper.selectList(w).stream().map(this::assignmentMap).collect(Collectors.toList()));
    }

    @PostMapping("/assignments")
    public Result<Map<String,Object>> createAssignment(@RequestBody Map<String,Object> body) {
        RRetentionAssignment e = assignmentFromMap(body);
        if (e.getId() == null || e.getId().isBlank()) e.setId("ra-" + System.currentTimeMillis());
        if (e.getStatus() == null) e.setStatus("ACTIVE");
        if (e.getCreatedOn() == null) e.setCreatedOn(LocalDateTime.now());
        // compute dueDate = startDate + policy periodDays if missing
        if (e.getDueDate() == null && e.getStartDate() != null && e.getPolicyId() != null) {
            RRetentionPolicy p = policyMapper.selectById(e.getPolicyId());
            if (p != null && p.getPeriodDays() != null) {
                e.setDueDate(e.getStartDate().plusDays(p.getPeriodDays()));
            }
        }
        assignmentMapper.insert(e);
        return Result.success(assignmentMap(assignmentMapper.selectById(e.getId())));
    }

    // ---- Legal hold ----
    @GetMapping("/assignments/{id}/holds")
    @Operation(summary = "指派的法定保留事件列表")
    public Result<List<Map<String,Object>>> holds(@PathVariable String id) {
        return Result.success(holdMapper.selectList(new LambdaQueryWrapper<RLegalHoldEvent>()
                .eq(RLegalHoldEvent::getAssignmentId, id).orderByDesc(RLegalHoldEvent::getTs))
                .stream().map(this::holdMap).collect(Collectors.toList()));
    }

    @PostMapping("/assignments/{id}/hold")
    @Operation(summary = "执行法定保留 HOLD")
    public Result<Map<String,Object>> hold(@PathVariable String id, @RequestBody(required=false) Map<String,Object> body) {
        RRetentionAssignment a = assignmentMapper.selectById(id);
        if (a == null) return Result.fail(404, "指派不存在");
        LocalDateTime now = LocalDateTime.now();
        a.setStatus("ON_HOLD");
        a.setCurrentHoldStart(now);
        a.setCurrentHoldEnd(null);
        assignmentMapper.updateById(a);
        RLegalHoldEvent ev = new RLegalHoldEvent();
        ev.setId("lh-" + System.currentTimeMillis());
        ev.setAssignmentId(id);
        ev.setAction("HOLD");
        ev.setHoldStart(now);
        ev.setReason(body != null ? (String) body.get("reason") : "法定保留");
        ev.setActorId(body != null ? (String) body.get("actorId") : null);
        ev.setTs(now);
        holdMapper.insert(ev);
        return Result.success(Map.<String,Object>of("assignmentId", id, "status", "ON_HOLD", "holdEventId", ev.getId()));
    }

    @PostMapping("/assignments/{id}/release")
    @Operation(summary = "解除法定保留 RELEASE")
    public Result<Map<String,Object>> release(@PathVariable String id, @RequestBody(required=false) Map<String,Object> body) {
        RRetentionAssignment a = assignmentMapper.selectById(id);
        if (a == null) return Result.fail(404, "指派不存在");
        LocalDateTime now = LocalDateTime.now();
        a.setStatus("ACTIVE");
        a.setCurrentHoldEnd(now);
        assignmentMapper.updateById(a);
        RLegalHoldEvent ev = new RLegalHoldEvent();
        ev.setId("lh-" + System.currentTimeMillis());
        ev.setAssignmentId(id);
        ev.setAction("RELEASE");
        ev.setHoldEnd(now);
        ev.setReason(body != null ? (String) body.get("reason") : "解除法定保留");
        ev.setActorId(body != null ? (String) body.get("actorId") : null);
        ev.setTs(now);
        holdMapper.insert(ev);
        return Result.success(Map.<String,Object>of("assignmentId", id, "status", "ACTIVE", "holdEventId", ev.getId()));
    }

    private Map<String,Object> policyMap(RRetentionPolicy e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("code", e.getCode());
        m.put("name", e.getName());
        m.put("description", e.getDescription());
        m.put("periodDays", e.getPeriodDays());
        m.put("startTrigger", e.getStartTrigger());
        m.put("createdOn", e.getCreatedOn() != null ? e.getCreatedOn().toString() : null);
        return m;
    }

    private Map<String,Object> assignmentMap(RRetentionAssignment e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("policyId", e.getPolicyId());
        m.put("objectType", e.getObjectType());
        m.put("objectId", e.getObjectId());
        m.put("startDate", e.getStartDate() != null ? e.getStartDate().toString() : null);
        m.put("dueDate", e.getDueDate() != null ? e.getDueDate().toString() : null);
        m.put("status", e.getStatus());
        m.put("currentHoldStart", e.getCurrentHoldStart() != null ? e.getCurrentHoldStart().toString() : null);
        m.put("currentHoldEnd", e.getCurrentHoldEnd() != null ? e.getCurrentHoldEnd().toString() : null);
        m.put("assignedBy", e.getAssignedBy());
        m.put("createdOn", e.getCreatedOn() != null ? e.getCreatedOn().toString() : null);
        return m;
    }

    private Map<String,Object> holdMap(RLegalHoldEvent e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("assignmentId", e.getAssignmentId());
        m.put("action", e.getAction());
        m.put("holdStart", e.getHoldStart() != null ? e.getHoldStart().toString() : null);
        m.put("holdEnd", e.getHoldEnd() != null ? e.getHoldEnd().toString() : null);
        m.put("reason", e.getReason());
        m.put("actorId", e.getActorId());
        m.put("ts", e.getTs() != null ? e.getTs().toString() : null);
        return m;
    }

    private RRetentionPolicy policyFromMap(Map<String,Object> m) {
        RRetentionPolicy e = new RRetentionPolicy();
        e.setCode(str(m.get("code")));
        e.setName(str(m.get("name")));
        e.setDescription(str(m.get("description")));
        if (m.get("periodDays") instanceof Number n) e.setPeriodDays(n.intValue());
        e.setStartTrigger(str(m.get("startTrigger")));
        return e;
    }

    private RRetentionAssignment assignmentFromMap(Map<String,Object> m) {
        RRetentionAssignment e = new RRetentionAssignment();
        e.setPolicyId(str(m.get("policyId")));
        e.setObjectType(str(m.get("objectType")));
        e.setObjectId(str(m.get("objectId")));
        if (m.get("startDate") instanceof String s) e.setStartDate(LocalDate.parse(s));
        if (m.get("dueDate") instanceof String s) e.setDueDate(LocalDate.parse(s));
        e.setStatus(str(m.get("status")));
        e.setAssignedBy(str(m.get("assignedBy")));
        return e;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
