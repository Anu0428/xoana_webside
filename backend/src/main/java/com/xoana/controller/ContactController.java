package com.xoana.controller;

import com.xoana.dto.ApiResponse;
import com.xoana.dto.ContactRequest;
import com.xoana.model.ContactMessage;
import com.xoana.repository.ContactMessageRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private final ContactMessageRepository contactMessageRepository;

    public ContactController(ContactMessageRepository contactMessageRepository) {
        this.contactMessageRepository = contactMessageRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ContactMessage>> submitMessage(@Valid @RequestBody ContactRequest request) {
        ContactMessage saved = contactMessageRepository.save(
                ContactMessage.builder().name(request.name().trim()).email(request.email().trim())
                        .message(request.message().trim()).build()
        );
        return ResponseEntity.ok(ApiResponse.success("消息已发送", saved));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ContactMessage>>> getMessages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ContactMessage> messages = contactMessageRepository.findAllByOrderByCreatedAtDesc(
                Pagination.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(messages));
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        contactMessageRepository.findById(id).ifPresent(msg -> {
            msg.setRead(true);
            contactMessageRepository.save(msg);
        });
        return ResponseEntity.ok(ApiResponse.success("已标记为已读", null));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(@PathVariable Long id) {
        contactMessageRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("已删除", null));
    }
}
