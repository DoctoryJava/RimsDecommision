package com.rims.decommission.controller;

import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/systems/{id}")
@Tag(name = "归档查询")
public class QueryController {

    @PostMapping("/query")
    @Operation(summary = "动态查询归档数据（走 Databricks SQL）")
    public Result<PageResult<Map<String,Object>>> query(
            @PathVariable Long id,
            @RequestBody Map<String,Object> body) {
        // TODO: DynamicQueryBuilder → DatabricksSqlExecutor + UC 掩码
        // 当前 Mock 返回空，保留 SQL 生成占位
        String mockSql = "SELECT * FROM lake.MOCK_V1.CUSTOMER_ORDER LIMIT 20";
        PageResult<Map<String,Object>> page = PageResult.of(0, List.of(), 1, 20);
        return Result.success(page, mockSql);
    }

    @GetMapping("/tables")
    @Operation(summary = "可查询表列表")
    public Result<List<String>> tables(@PathVariable Long id) {
        return Result.success(List.of("CUSTOMER_ORDER", "ORDER_LINE"));
    }

    @GetMapping("/attachments/sas")
    @Operation(summary = "签发 SAS URL（≤15min）")
    public Result<Map<String,String>> sas(@PathVariable Long id, @RequestParam String objectKey) {
        // TODO: BlobSasService.generateSasUrl
        String mockUrl = "https://mock.blob.core.windows.net/container/" + objectKey + "?sv=mock&sig=mock";
        return Result.success(Map.of("sasUrl", mockUrl));
    }
}
