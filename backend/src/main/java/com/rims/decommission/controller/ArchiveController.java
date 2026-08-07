package com.rims.decommission.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rims.decommission.common.PageResult;
import com.rims.decommission.common.Result;
import com.rims.decommission.entity.RArchiveBatch;
import com.rims.decommission.entity.RArchiveFile;
import com.rims.decommission.entity.RArchiveSet;
import com.rims.decommission.entity.RArchiveSetItem;
import com.rims.decommission.mapper.RArchiveBatchMapper;
import com.rims.decommission.mapper.RArchiveFileMapper;
import com.rims.decommission.mapper.RArchiveSetItemMapper;
import com.rims.decommission.mapper.RArchiveSetMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StringUtils;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/archive")
@Tag(name = "归档产物")
public class ArchiveController {

    private final RArchiveBatchMapper batchMapper;
    private final RArchiveFileMapper fileMapper;
    private final RArchiveSetMapper setMapper;
    private final RArchiveSetItemMapper setItemMapper;

    public ArchiveController(RArchiveBatchMapper batchMapper, RArchiveFileMapper fileMapper,
                             RArchiveSetMapper setMapper, RArchiveSetItemMapper setItemMapper) {
        this.batchMapper = batchMapper;
        this.fileMapper = fileMapper;
        this.setMapper = setMapper;
        this.setItemMapper = setItemMapper;
    }

    // ---- Batches ----
    @GetMapping("/batches")
    @Operation(summary = "归档批次列表")
    public Result<PageResult<Map<String,Object>>> batches(
            @RequestParam(defaultValue="1") int pageNum,
            @RequestParam(defaultValue="20") int pageSize,
            @RequestParam(required=false) String jobId,
            @RequestParam(required=false) String result) {
        LambdaQueryWrapper<RArchiveBatch> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(jobId)) w.eq(RArchiveBatch::getArchiveJobId, jobId);
        if (StringUtils.hasText(result)) w.eq(RArchiveBatch::getResult, result);
        w.orderByDesc(RArchiveBatch::getStartedAt);
        var ip = batchMapper.selectPage(new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(pageNum, pageSize), w);
        List<Map<String,Object>> list = ip.getRecords().stream().map(this::batchMap).collect(Collectors.toList());
        return Result.success(PageResult.of(ip.getTotal(), list, pageNum, pageSize));
    }

    // ---- Files ----
    @GetMapping("/files")
    @Operation(summary = "归档文件列表")
    public Result<List<Map<String,Object>>> files(@RequestParam(required=false) String batchId) {
        LambdaQueryWrapper<RArchiveFile> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(batchId)) w.eq(RArchiveFile::getArchiveBatchId, batchId);
        w.orderByAsc(RArchiveFile::getId);
        return Result.success(fileMapper.selectList(w).stream().map(this::fileMap).collect(Collectors.toList()));
    }

    // ---- Sets ----
    @GetMapping("/sets")
    @Operation(summary = "归档集列表")
    public Result<List<Map<String,Object>>> sets(@RequestParam(required=false) String batchId) {
        LambdaQueryWrapper<RArchiveSet> w = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(batchId)) w.eq(RArchiveSet::getArchiveBatchId, batchId);
        w.orderByAsc(RArchiveSet::getId);
        return Result.success(setMapper.selectList(w).stream().map(this::setMap).collect(Collectors.toList()));
    }

    @GetMapping("/sets/{setId}/items")
    @Operation(summary = "归档集条目列表")
    public Result<List<Map<String,Object>>> setItems(@PathVariable String setId) {
        return Result.success(setItemMapper.selectList(new LambdaQueryWrapper<RArchiveSetItem>()
                .eq(RArchiveSetItem::getArchiveSetId, setId)).stream().map(this::setItemMap).collect(Collectors.toList()));
    }

    private Map<String,Object> batchMap(RArchiveBatch e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("archiveJobId", e.getArchiveJobId());
        m.put("batchYear", e.getBatchYear());
        m.put("startedAt", e.getStartedAt() != null ? e.getStartedAt().toString() : null);
        m.put("finishedAt", e.getFinishedAt() != null ? e.getFinishedAt().toString() : null);
        m.put("rowsOut", e.getRowsOut());
        m.put("bytesOut", e.getBytesOut());
        m.put("result", e.getResult());
        m.put("logUrl", e.getLogUrl());
        m.put("correlationId", e.getCorrelationId());
        return m;
    }

    private Map<String,Object> fileMap(RArchiveFile e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("archiveBatchId", e.getArchiveBatchId());
        m.put("schemaName", e.getSchemaName());
        m.put("tableName", e.getTableName());
        m.put("blobUrl", e.getBlobUrl());
        m.put("sizeBytes", e.getSizeBytes());
        m.put("checksum", e.getChecksum());
        m.put("etag", e.getEtag());
        m.put("createdOn", e.getCreatedOn() != null ? e.getCreatedOn().toString() : null);
        return m;
    }

    private Map<String,Object> setMap(RArchiveSet e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("archiveBatchId", e.getArchiveBatchId());
        m.put("setName", e.getSetName());
        m.put("blobDirUrl", e.getBlobDirUrl());
        m.put("itemsCount", e.getItemsCount());
        m.put("bytesTotal", e.getBytesTotal());
        m.put("createdOn", e.getCreatedOn() != null ? e.getCreatedOn().toString() : null);
        return m;
    }

    private Map<String,Object> setItemMap(RArchiveSetItem e) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("archiveSetId", e.getArchiveSetId());
        m.put("originalPath", e.getOriginalPath());
        m.put("originalName", e.getOriginalName());
        m.put("blobUrl", e.getBlobUrl());
        m.put("sizeBytes", e.getSizeBytes());
        m.put("checksum", e.getChecksum());
        m.put("contentType", e.getContentType());
        m.put("copiedAt", e.getCopiedAt() != null ? e.getCopiedAt().toString() : null);
        return m;
    }
}
