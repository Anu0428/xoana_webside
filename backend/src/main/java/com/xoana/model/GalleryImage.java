package com.xoana.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record GalleryImage(
        @NotBlank @Pattern(regexp = "^(https?://|/(?!/)).+", message = "图片地址必须是 HTTP(S) 或站内路径") String src,
        String alt,
        @NotBlank @Pattern(regexp = "cover|contain") String fit) {
}
