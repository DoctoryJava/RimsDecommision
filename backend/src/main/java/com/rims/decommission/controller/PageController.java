package com.rims.decommission.controller;

import com.rims.decommission.common.Result;
import com.rims.decommission.mock.MockStore;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pages")
@Tag(name = "页面管理")
public class PageController {
    @GetMapping
    public Result<List<Map<String,Object>>> list() {
        return Result.success(MockStore.pages());
    }
    @GetMapping("/user")
    public Result<List<Map<String,Object>>> userPages() {
        return Result.success(MockStore.pages());
    }
    @PutMapping("/order")
    public Result<List<Map<String,Object>>> order(@RequestBody Map<String,Object> body) {
        return Result.success(MockStore.pages());
    }
}
