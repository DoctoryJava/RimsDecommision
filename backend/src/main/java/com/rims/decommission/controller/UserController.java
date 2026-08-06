package com.rims.decommission.controller;

import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.mock.MockStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@Tag(name = "用户管理")
public class UserController {

    @GetMapping
    @Operation(summary = "用户列表")
    public Result<PageResult<Map<String,Object>>> list(
            @RequestParam(defaultValue="1") int pageNum,
            @RequestParam(defaultValue="20") int pageSize,
            @RequestParam(required=false) String search,
            @RequestParam(required=false) String role) {
        var list = MockStore.users();
        if (search != null && !search.isBlank()) {
            String s = search.toLowerCase();
            list = list.stream().filter(u -> u.get("name").toString().toLowerCase().contains(s) || u.get("email").toString().toLowerCase().contains(s)).collect(Collectors.toList());
        }
        if (role != null && !role.isBlank()) {
            list = list.stream().filter(u -> role.equals(u.get("role"))).collect(Collectors.toList());
        }
        int from = Math.min((pageNum-1)*pageSize, list.size());
        int to = Math.min(from+pageSize, list.size());
        return Result.success(PageResult.of(list.size(), list.subList(from,to), pageNum, pageSize));
    }

    @GetMapping("/{id}")
    public Result<Map<String,Object>> detail(@PathVariable String id) {
        return MockStore.users().stream().filter(u -> id.equals(u.get("id"))).findFirst()
                .map(Result::success).orElse(Result.fail(404,"用户不存在"));
    }

    @PostMapping
    @Operation(summary = "创建用户")
    public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body) {
        body.put("id","u-"+System.currentTimeMillis());
        return Result.success(body);
    }

    @PutMapping("/{id}")
    public Result<Map<String,Object>> update(@PathVariable String id, @RequestBody Map<String,Object> body) {
        body.put("id", id);
        return Result.success(body);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        return Result.success(null);
    }
}
