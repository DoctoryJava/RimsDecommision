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
@RequestMapping("/api")
@Tag(name = "归档查询")
public class QueryController {

    // keep old /systems/{id}/query for backward compat
    @PostMapping("/systems/{id}/query")
    @Operation(summary = "动态查询归档数据（兼容）")
    public Result<PageResult<Map<String,Object>>> queryCompat(@PathVariable String id, @RequestBody Map<String,Object> body) {
        return query(body);
    }

    @PostMapping("/query/execute")
    @Operation(summary = "动态查询归档数据")
    public Result<PageResult<Map<String,Object>>> query(@RequestBody Map<String,Object> body) {
        // body: {configId, filters, sortField, sortDirection, page, pageSize}
        String configId = (String) body.getOrDefault("configId","qc-001");
        int page = body.get("page") instanceof Number ? ((Number)body.get("page")).intValue() : 1;
        int pageSize = body.get("pageSize") instanceof Number ? ((Number)body.get("pageSize")).intValue() : 10;
        // mock rows from physicalTables
        var tables = MockStore.physicalTables();
        // for demo return orders joined with customers
        List<Map<String,Object>> rows = new ArrayList<>();
        var orders = (List<Map<String,Object>>) tables.stream().filter(t -> "orders".equals(t.get("name"))).findFirst().map(t->t.get("rows")).orElse(List.of());
        var customers = (Map<String,Map<String,Object>>) ((List<Map<String,Object>>) tables.stream().filter(t->"customers".equals(t.get("name"))).findFirst().map(t->t.get("rows")).orElse(List.of())).stream().collect(Collectors.toMap(m->(String)m.get("customer_id"), m->m));
        var products = (Map<String,Map<String,Object>>) ((List<Map<String,Object>>) tables.stream().filter(t->"products".equals(t.get("name"))).findFirst().map(t->t.get("rows")).orElse(List.of())).stream().collect(Collectors.toMap(m->(String)m.get("product_id"), m->m));
        for (var o: (List<Map<String,Object>>)orders) {
            Map<String,Object> r=new LinkedHashMap<>();
            r.put("order_id", o.get("order_id"));
            r.put("order_date", o.get("order_date"));
            r.put("customer_id", o.get("customer_id"));
            var c = customers.get(o.get("customer_id"));
            r.put("customer_name", c==null?null:c.get("name"));
            r.put("region", c==null?null:c.get("region"));
            var p = products.get(o.get("product_id"));
            r.put("product_name", p==null?null:p.get("product_name"));
            r.put("quantity", o.get("quantity"));
            r.put("amount", o.get("amount"));
            r.put("status", o.get("status"));
            rows.add(r);
        }
        // apply filters if any
        Object filtersObj = body.get("filters");
        if (filtersObj instanceof List) {
            List<Map<String,Object>> filters = (List<Map<String,Object>>) filtersObj;
            for (var f: filters) {
                String field = (String)f.get("field");
                String op = (String)f.get("operator");
                String val = String.valueOf(f.get("value"));
                if (field==null||op==null) continue;
                rows = rows.stream().filter(r -> {
                    Object v = r.get(field);
                    if (v==null) return op.equals("is_null");
                    String vs = String.valueOf(v);
                    return switch(op) {
                        case "eq" -> vs.equals(val);
                        case "ne" -> !vs.equals(val);
                        case "like" -> vs.toLowerCase().contains(val.toLowerCase());
                        case "gt" -> { try{ yield Double.parseDouble(vs) > Double.parseDouble(val);} catch(Exception e){yield false;}}
                        default -> true;
                    };
                }).collect(Collectors.toList());
            }
        }
        // sort
        String sortField = (String) body.getOrDefault("sortField","order_id");
        String sortDir = (String) body.getOrDefault("sortDirection","asc");
        if (sortField != null) {
            final String sf = sortField;
            rows.sort((a,b)->{
                Object av=a.get(sf), bv=b.get(sf);
                if(av==null) return 1; if(bv==null) return -1;
                int cmp = String.valueOf(av).compareTo(String.valueOf(bv));
                return "desc".equals(sortDir)?-cmp:cmp;
            });
        }
        int total = rows.size();
        int from = Math.min((page-1)*pageSize, total);
        int to = Math.min(from+pageSize, total);
        List<Map<String,Object>> pageRows = rows.subList(from,to);
        String sql = "SELECT * FROM orders LEFT JOIN customers ON orders.customer_id=customers.customer_id LEFT JOIN products ON orders.product_id=products.product_id LIMIT "+pageSize+" OFFSET "+from+" -- mock";
        PageResult<Map<String,Object>> pr = PageResult.of(total, pageRows, page, pageSize);
        // add sql as message for demo
        return Result.success(pr, sql);
    }

    @PostMapping("/query-configs")
    @Operation(summary = "创建查询配置")
    public Result<Map<String,Object>> createConfig(@RequestBody Map<String,Object> body) {
        body.putIfAbsent("id","qc-"+System.currentTimeMillis());
        return Result.success(body);
    }

    @GetMapping("/query-configs")
    @Operation(summary = "查询配置列表")
    public Result<List<Map<String,Object>>> listConfigs() {
        return Result.success(MockStore.queryConfigs());
    }

    @GetMapping("/query-configs/{id}")
    public Result<Map<String,Object>> getConfig(@PathVariable String id) {
        return MockStore.queryConfigs().stream().filter(c->id.equals(c.get("id"))).findFirst()
                .map(Result::success).orElse(Result.fail(404,"配置不存在"));
    }

    @PutMapping("/query-configs/{id}")
    public Result<Map<String,Object>> updateConfig(@PathVariable String id, @RequestBody Map<String,Object> body) {
        body.put("id",id);
        return Result.success(body);
    }

    @DeleteMapping("/query-configs/{id}")
    public Result<Void> deleteConfig(@PathVariable String id) {
        return Result.success(null);
    }

    @GetMapping("/systems/{id}/tables")
    @Operation(summary = "可查询表列表")
    public Result<List<String>> tables(@PathVariable String id) {
        return Result.success(List.of("orders","customers","products"));
    }

    @GetMapping("/systems/{id}/tables/{table}/count")
    public Result<Map<String,Object>> count(@PathVariable String id, @PathVariable String table) {
        return Result.success(Map.of("table",table,"count",128400));
    }

    @GetMapping("/systems/{id}/attachments/sas")
    @Operation(summary = "签发 SAS URL（≤15min）")
    public Result<Map<String,String>> sas(@PathVariable String id, @RequestParam String objectKey) {
        String mockUrl = "https://mock.blob.core.windows.net/container/" + objectKey + "?sv=mock&sig=mock";
        return Result.success(Map.of("sasUrl", mockUrl));
    }
}
