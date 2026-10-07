package com.xoana.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class GalleryImagesConverter implements AttributeConverter<List<GalleryImage>, String> {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<GalleryImage> images) {
        if (images == null) return null;
        try {
            return MAPPER.writeValueAsString(images);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("无法保存 Gallery 图片", e);
        }
    }

    @Override
    public List<GalleryImage> convertToEntityAttribute(String value) {
        if (value == null) return null;
        try {
            return MAPPER.readValue(value, new TypeReference<List<GalleryImage>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("无法读取 Gallery 图片", e);
        }
    }
}
