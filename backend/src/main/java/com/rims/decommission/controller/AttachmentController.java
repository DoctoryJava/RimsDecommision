package com.rims.decommission.controller;

import com.rims.decommission.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
@Tag(name = "附件下载")
public class AttachmentController {

    private final AuditLogService auditLogService;

    public AttachmentController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /** 下载本地附件：接收本地路径，读文件流返回；每次下载记录审计。 */
    @PostMapping("/download")
    @Operation(summary = "下载本地附件（按路径读取文件流）")
    public void download(@RequestBody Map<String,Object> body, HttpServletResponse response) throws IOException {
        String path = body.get("path") == null ? "" : body.get("path").toString().trim();
        String systemId = body.get("systemId") == null ? "" : body.get("systemId").toString();
        String status = "failed";
        try {
            if (path.isEmpty()) throw new IllegalStateException("附件路径为空");
            Path file = Paths.get(path).toAbsolutePath().normalize();
            if (!Files.exists(file) || !Files.isRegularFile(file)) {
                throw new IllegalStateException("文件不存在: " + path);
            }
            String fileName = file.getFileName().toString();
            response.setContentType(guessContentType(fileName));
            response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + URLEncoder.encode(fileName, StandardCharsets.UTF_8));
            response.setHeader("X-Content-Type-Options", "nosniff");
            try (InputStream in = Files.newInputStream(file); OutputStream out = response.getOutputStream()) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                out.flush();
            }
            status = "success";
            auditLogService.record("download", path, status, systemId,
                    Map.of("file", path, "name", fileName));
        } catch (Exception e) {
            auditLogService.record("download", path, status, systemId,
                    Map.of("file", path, "error", e.getMessage() == null ? "下载失败" : e.getMessage()));
            // 未开始写流时返回错误 JSON
            if (!response.isCommitted()) {
                response.setStatus(404);
                response.setContentType("application/json;charset=UTF-8");
                String msg = (e.getMessage() == null ? "下载失败" : e.getMessage()).replace("\"", "\\\"");
                response.getWriter().write("{\"code\":404,\"message\":\"" + msg + "\",\"data\":null}");
            }
        }
    }

    private static String guessContentType(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".csv")) return "text/csv;charset=UTF-8";
        if (lower.endsWith(".json")) return "application/json;charset=UTF-8";
        if (lower.endsWith(".txt") || lower.endsWith(".log")) return "text/plain;charset=UTF-8";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        return "application/octet-stream";
    }
}
