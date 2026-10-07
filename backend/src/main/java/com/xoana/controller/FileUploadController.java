package com.xoana.controller;

import com.xoana.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.Arrays;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/admin/upload")
@PreAuthorize("hasRole('ADMIN')")
public class FileUploadController {
    private static final Logger log = LoggerFactory.getLogger(FileUploadController.class);
    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @PostMapping("/image")
    public ResponseEntity<ApiResponse<String>> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("文件为空"));
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            return ResponseEntity.status(413).body(ApiResponse.error("图片不能超过 10 MB"));
        }
        try {
            String extension;
            try (InputStream input = file.getInputStream()) {
                extension = imageExtension(input.readNBytes(16));
            }
            if (extension == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("只支持 PNG、JPEG、GIF 或 WebP 图片"));
            }
            // Choose a safe extension from the file signature, never from the client filename.
            String filename = UUID.randomUUID() + extension;
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);
            Path filePath = uploadPath.resolve(filename);
            file.transferTo(filePath.toFile());
            return ResponseEntity.ok(ApiResponse.success("/uploads/" + filename));
        } catch (IOException exception) {
            log.error("Unable to save uploaded image", exception);
            return ResponseEntity.internalServerError().body(ApiResponse.error("保存文件失败，请稍后重试"));
        }
    }

    private String imageExtension(byte[] header) {
        if (header.length >= 8 && Arrays.equals(Arrays.copyOf(header, 8),
                new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'})) return ".png";
        if (header.length >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8
                && (header[2] & 0xff) == 0xff) return ".jpg";
        String signature = new String(header, StandardCharsets.US_ASCII);
        if (signature.startsWith("GIF87a") || signature.startsWith("GIF89a")) return ".gif";
        if (header.length >= 12 && signature.startsWith("RIFF") && signature.substring(8, 12).equals("WEBP")) return ".webp";
        return null;
    }
}
