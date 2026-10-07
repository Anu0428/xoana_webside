package com.xoana.controller;

import com.xoana.dto.ApiResponse;
import com.xoana.model.SiteTraffic;
import com.xoana.repository.OrderRepository;
import com.xoana.repository.SiteTrafficRepository;
import com.xoana.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/traffic")
public class TrafficController {

    private final SiteTrafficRepository trafficRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public TrafficController(SiteTrafficRepository trafficRepository,
                             UserRepository userRepository,
                             OrderRepository orderRepository) {
        this.trafficRepository = trafficRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    @PostMapping("/track")
    public ResponseEntity<Void> trackVisit(@RequestBody Map<String, String> body,
                                           HttpServletRequest request) {
        SiteTraffic traffic = SiteTraffic.builder()
                .pagePath(limit(body.get("path"), 200, "/"))
                .visitorIp(request.getRemoteAddr())
                .userAgent(limit(request.getHeader("User-Agent"), 500, null))
                .referer(limit(request.getHeader("Referer"), 500, null))
                .visitedAt(LocalDateTime.now())
                .build();
        trafficRepository.save(traffic);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats(
            @RequestParam(defaultValue = "7") int days) {
        if (days < 1 || days > 365) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "days 必须在 1 到 365 之间");
        }
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(days);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalVisits", trafficRepository.countByVisitedAtBetween(start, end));
        stats.put("totalUsers", userRepository.count());
        stats.put("totalOrders", orderRepository.count());
        stats.put("topPages", trafficRepository.getTopPages(start, end));
        stats.put("dailyVisits", trafficRepository.getDailyVisits(start, end));

        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    private String limit(String value, int length, String fallback) {
        if (value == null || value.isBlank()) return fallback;
        return value.substring(0, Math.min(value.length(), length));
    }
}
