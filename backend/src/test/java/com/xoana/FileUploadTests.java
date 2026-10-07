package com.xoana;

import com.xoana.controller.FileUploadController;
import com.xoana.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class FileUploadTests {
    @TempDir Path directory;

    @Test
    void refusesHtmlMasqueradingAsAnImageWithoutWritingAFile() throws Exception {
        FileUploadController controller = controller();
        ResponseEntity<ApiResponse<String>> response = controller.uploadImage(new MockMultipartFile(
                "file", "photo.png", "image/png", "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8)));
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        try (var files = Files.list(directory)) {
            assertThat(files).isEmpty();
        }
    }

    @Test
    void ignoresTheClientExtensionAndSavesTheDetectedImageFormat() throws Exception {
        byte[] png = Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=");
        ResponseEntity<ApiResponse<String>> response = controller().uploadImage(
                new MockMultipartFile("file", "../../photo.html", "image/png", png));
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        String imageUrl = response.getBody().getData();
        assertThat(imageUrl).startsWith("/uploads/").endsWith(".png");
        Path saved = directory.resolve(imageUrl.substring("/uploads/".length()));
        assertThat(Files.readAllBytes(saved)).isEqualTo(png);
    }

    private FileUploadController controller() {
        FileUploadController controller = new FileUploadController();
        ReflectionTestUtils.setField(controller, "uploadDir", directory.toString());
        return controller;
    }
}
