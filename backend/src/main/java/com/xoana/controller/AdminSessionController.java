package com.xoana.controller;

import com.xoana.dto.AdminSessionResponse;
import com.xoana.dto.ApiResponse;
import com.xoana.model.User;
import com.xoana.repository.UserRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSessionController {
    private final UserRepository userRepository;

    public AdminSessionController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/session")
    public ResponseEntity<ApiResponse<AdminSessionResponse>> getSession(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName()).orElse(null);
        if (user == null || !user.isEnabled()) {
            return ResponseEntity.status(401).cacheControl(CacheControl.noStore())
                    .body(ApiResponse.error("Authentication required"));
        }
        if (user.getRole() != User.Role.ADMIN) {
            return ResponseEntity.status(403).cacheControl(CacheControl.noStore())
                    .body(ApiResponse.error("Administrator access required"));
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.success(
                new AdminSessionResponse(user.getId(), user.getUsername(), user.getNickname(),
                        user.getEmail(), user.getRole().name())));
    }
}
