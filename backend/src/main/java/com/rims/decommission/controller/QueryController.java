package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RPhysicalTable;
import com.rims.decommission.entity.RQueryConfig;
import com.rims.decommission.mapper.RPhysicalTableMapper;
import com.rims.decommission.mapper.RQueryConfigMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Tag(name = "归档查询")
public class QueryController {

    private final RPhysicalTableMapper tableMapper;
    private final RQueryConfigMapper configMapper;

    public QueryController(RPhysicalTableMapper tableMapper, RQueryConfigMapper configMapper) {
        this.tableMapper = tableMapper;
        this.configMapper = configMapper;
    }

    // keep old /systems/{id}/query for backward compat
    @PostMapping("/systems/{id}/query")
    @Operation(summary = "动态查询归档数据（兼容）")
    public Result<PageResult<Map<String,Object>>> queryCompat(@PathVariable String id, @RequestBody Map<String,Object> body) {
        return query(body);
    }

    @PostMapping("/query/execute")
    @Operation(summary = "动态查询归档数据（基于 r_physical_table 真实数据）")
    public Result<PageResult<Map<String,Object>>> query(@RequestBody Map<String,Object> body) {
        String configId = (String) body.getOrDefault("configId","qc-001");
        int page = body.get("page") instanceof Number ? ((Number)body.get("page")).intValue() : 1;
        int pageSize = body.get("pageSize") instanceof Number ? ((Number)body.get("pageSize")).intValue() : 10;

        Map<String, RPhysicalTable> byName = tableMapper.selectList(null).stream()
                .collect(Collectors.toMap(RPhysicalTable::getName, t -> t, (a,b)->a));

        RPhysicalTable ordersT = byName.get("orders");
        RPhysicalTable customersT = byName.get("customers");
        RPhysicalTable productsT = byName.get("products");

        List<Map<String,Object>> orders = ordersT != null && ordersT.getRows() != null ? ordersT.getRows() : List.of();
        Map<String,Map<String,Object>> customers = index(customersT);
        Map<String,Map<String,Object>> products = index(productsT);

        List<Map<String,Object>> rows = new ArrayList<>();
        for (var o: orders) {
            Map<String,Object> r=new LinkedHashMap<>();
            r.put("order_id", o.get("order_id"));
            r.put("order_date", o.get("order_date"));
            r.put("customer_id", o.get("customer_id"));
            var c = customers.get(o.get("customer_id"));
            r.put("customer_name", c==null?null:c.get("name"));
            r.put("region", c==null?null:c.get("region"));
            r.put("level", c==null?null:c.get("level"));
            r.put("customer_email", c==null?null:c.get("email"));
            var p = products.get(o.get("product_id"));
            r.put("product_name", p==null?null:p.get("product_name"));
            r.put("category", p==null?null:p.get("category"));
            r.put("quantity", o.get("quantity"));
            r.put("amount", o.get("amount"));
            r.put("status", o.get("status"));
            r.put("is_paid", o.get("is_paid"));
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
        PageResult<Map<String,Object>> pr = PageResult.of(total, pageRows, page, pageSize);
        // 回显给前端的等价 SQL（T-SQL 语法）：SQL Server 用 OFFSET/FETCH 分页，且要求带 ORDER BY
        String sql = "SELECT * FROM orders " +
                "LEFT JOIN customers ON orders.customer_id = customers.customer_id " +
                "LEFT JOIN products ON orders.product_id = products.product_id " +
                "ORDER BY " + sortField + " " + ("desc".equals(sortDir) ? "DESC" : "ASC") + " " +
                "OFFSET " + from + " ROWS FETCH NEXT " + pageSize + " ROWS ONLY";
        return Result.success(pr, sql);
    }

    @PostMapping("/query-configs")
    @Operation(summary = "创建查询配置（写入 r_query_config）")
    public Result<Map<String,Object>> createConfig(@RequestBody Map<String,Object> body) {
        RQueryConfig c = fromMap(body);
        if (c.getId() == null || c.getId().isBlank()) c.setId("qc-" + System.currentTimeMillis());
        configMapper.insert(c);
        return Result.success(toConfigMap(configMapper.selectById(c.getId())));
    }

    @GetMapping("/query-configs")
    @Operation(summary = "查询配置列表（可按系统筛选）")
    public Result<List<Map<String,Object>>> listConfigs(@RequestParam(required=false) String systemId) {
        LambdaQueryWrapper<RQueryConfig> w = new LambdaQueryWrapper<RQueryConfig>()
                .orderByAsc(RQueryConfig::getId);
        if (systemId != null && !systemId.isBlank()) {
            w.eq(RQueryConfig::getSystemId, systemId);
        }
        return Result.success(configMapper.selectList(w)
                .stream().map(this::toConfigMap).collect(Collectors.toList()));
    }

    @GetMapping("/query-configs/{id}")
    public Result<Map<String,Object>> getConfig(@PathVariable String id) {
        RQueryConfig c = configMapper.selectById(id);
        if (c == null) return Result.fail(404,"配置不存在");
        return Result.success(toConfigMap(c));
    }

    @PutMapping("/query-configs/{id}")
    public Result<Map<String,Object>> updateConfig(@PathVariable String id, @RequestBody Map<String,Object> body) {
        RQueryConfig c = fromMap(body);
        c.setId(id);
        configMapper.updateById(c);
        return Result.success(toConfigMap(configMapper.selectById(id)));
    }

    @DeleteMapping("/query-configs/{id}")
    public Result<Void> deleteConfig(@PathVariable String id) {
        configMapper.deleteById(id);
        return Result.success(null);
    }

    @GetMapping("/systems/{id}/tables")
    @Operation(summary = "可查询表列表")
    public Result<List<String>> tables(@PathVariable String id) {
        return Result.success(tableMapper.selectList(null).stream().map(RPhysicalTable::getName).collect(Collectors.toList()));
    }

    @GetMapping("/systems/{id}/tables/{table}/count")
    public Result<Map<String,Object>> count(@PathVariable String id, @PathVariable String table) {
        RPhysicalTable t = tableMapper.selectOne(new LambdaQueryWrapper<RPhysicalTable>().eq(RPhysicalTable::getName, table));
        long cnt = t != null && t.getRows() != null ? t.getRows().size() : 0;
        return Result.success(Map.<String,Object>of("table", table, "count", cnt));
    }

    @GetMapping("/systems/{id}/attachments/sas")
    @Operation(summary = "签发 SAS URL（≤15min）")
    public Result<Map<String,String>> sas(@PathVariable String id, @RequestParam String objectKey) {
        String mockUrl = "https://mock.blob.core.windows.net/container/" + objectKey + "?sv=mock&sig=mock";
        return Result.success(Map.<String,String>of("sasUrl", mockUrl));
    }

    private Map<String,Map<String,Object>> index(RPhysicalTable t) {
        Map<String,Map<String,Object>> map = new HashMap<>();
        if (t != null && t.getRows() != null) {
            for (Map<String,Object> r : t.getRows()) {
                Object key = r.get("customer_id") != null ? r.get("customer_id") : r.get("product_id");
                if (key != null) map.put(String.valueOf(key), r);
            }
        }
        return map;
    }

    private Map<String,Object> toConfigMap(RQueryConfig c) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("systemId", c.getSystemId());
        m.put("name", c.getName());
        m.put("description", c.getDescription());
        m.put("baseTable", c.getBaseTable());
        m.put("joins", c.getJoins() != null ? c.getJoins() : List.of());
        m.put("fields", c.getFields() != null ? c.getFields() : List.of());
        m.put("defaultSort", c.getDefaultSort());
        m.put("pageSize", c.getPageSize() != null ? c.getPageSize() : 10);
        m.put("status", c.getStatus());
        m.put("createdBy", c.getCreatedBy());
        m.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        m.put("updatedAt", c.getUpdatedAt() != null ? c.getUpdatedAt().toString() : null);
        return m;
    }

    private RQueryConfig fromMap(Map<String,Object> body) {
        RQueryConfig c = new RQueryConfig();
        c.setSystemId(str(body.get("systemId")));
        c.setName(str(body.get("name")));
        c.setDescription(str(body.get("description")));
        c.setBaseTable(str(body.get("baseTable")));
        if (body.get("joins") instanceof List<?> l) { @SuppressWarnings("unchecked") List<Map<String,Object>> x=(List<Map<String,Object>>)l; c.setJoins(x); }
        if (body.get("fields") instanceof List<?> l) { @SuppressWarnings("unchecked") List<Map<String,Object>> x=(List<Map<String,Object>>)l; c.setFields(x); }
        if (body.get("defaultSort") instanceof Map<?,?> m) { @SuppressWarnings("unchecked") Map<String,Object> x=(Map<String,Object>)m; c.setDefaultSort(x); }
        if (body.get("pageSize") instanceof Number n) c.setPageSize(n.intValue());
        c.setStatus(str(body.get("status")));
        c.setCreatedBy(str(body.get("createdBy")));
        return c;
    }

    private static String str(Object o) { return o != null ? o.toString() : null; }
}
