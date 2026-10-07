package com.xoana.controller;

import com.xoana.dto.ApiResponse;
import com.xoana.dto.ProfileUpdateRequest;
import com.xoana.model.User;
import com.xoana.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getProfile(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .map(u -> ResponseEntity.ok(ApiResponse.success(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<User>> updateProfile(@Valid @RequestBody ProfileUpdateRequest updates,
                                                           Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .map(user -> {
                    if (updates.getNickname() != null) user.setNickname(updates.getNickname());
                    if (updates.getPhone() != null) user.setPhone(updates.getPhone());
                    if (updates.getAddress() != null) user.setAddress(updates.getAddress());
                    if (updates.getAvatar() != null) user.setAvatar(updates.getAvatar());
                    user.setUpdatedAt(java.time.LocalDateTime.now());
                    return ResponseEntity.ok(ApiResponse.success(userRepository.save(user)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<User>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = Pagination.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(userRepository.findAll(pageable)));
    }

    @PutMapping("/admin/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setEnabled(!user.isEnabled());
                    return ResponseEntity.ok(ApiResponse.success(userRepository.save(user)));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
