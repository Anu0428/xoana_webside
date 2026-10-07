package com.xoana.controller;

import com.xoana.dto.ApiResponse;
import com.xoana.model.SiteSettings;
import com.xoana.repository.SiteSettingsRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings")
public class SiteSettingsController {

    private final SiteSettingsRepository siteSettingsRepository;

    public SiteSettingsController(SiteSettingsRepository siteSettingsRepository) {
        this.siteSettingsRepository = siteSettingsRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<SiteSettings>> getSettings() {
        SiteSettings settings = siteSettingsRepository.findById(1L)
                .orElse(new SiteSettings());
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SiteSettings>> updateSettings(@Valid @RequestBody SiteSettings settings) {
        settings.setId(1L);
        SiteSettings saved = siteSettingsRepository.save(settings);
        return ResponseEntity.ok(ApiResponse.success("设置已保存", saved));
    }
}
