package com.xoana.repository;

import com.xoana.model.SiteTraffic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface SiteTrafficRepository extends JpaRepository<SiteTraffic, Long> {
    long countByVisitedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT t.pagePath, COUNT(t) as visits FROM SiteTraffic t " +
           "WHERE t.visitedAt BETWEEN :start AND :end " +
           "GROUP BY t.pagePath ORDER BY visits DESC")
    List<Object[]> getTopPages(LocalDateTime start, LocalDateTime end);

    @Query("SELECT CAST(t.visitedAt AS date), COUNT(t) FROM SiteTraffic t " +
            "WHERE t.visitedAt BETWEEN :start AND :end " +
            "GROUP BY CAST(t.visitedAt AS date) ORDER BY CAST(t.visitedAt AS date)")
    List<Object[]> getDailyVisits(LocalDateTime start, LocalDateTime end);
}
