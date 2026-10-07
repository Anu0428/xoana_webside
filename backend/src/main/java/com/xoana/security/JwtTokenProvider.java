package com.xoana.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);
    private static final String LEGACY_PUBLIC_SECRET =
            "xoanaSecretKey2024VeryLongSecretKeyForJWTSigningThatIsAtLeast256BitsLong";

    private final Key signingKey;
    private final long jwtExpiration;

    public JwtTokenProvider(@Value("${app.jwt.secret:}") String jwtSecret,
                            @Value("${app.jwt.expiration}") long jwtExpiration) {
        this.jwtExpiration = jwtExpiration;
        if (jwtSecret == null || jwtSecret.isBlank()) {
            signingKey = Keys.secretKeyFor(SignatureAlgorithm.HS256);
            log.warn("APP_JWT_SECRET is unset; using a random signing key for this process. "
                    + "Sessions expire on restart. Set a secure shared secret for persistent or multi-instance deployments.");
        } else {
            if (jwtSecret.equals(LEGACY_PUBLIC_SECRET)) {
                throw new IllegalArgumentException("The previously published JWT signing secret is insecure; configure APP_JWT_SECRET");
            }
            signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        }
    }

    private Key getSigningKey() {
        return signingKey;
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        // 添加权限信息到 JWT claims 中
        claims.put("authorities", userDetails.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .toList());
        return createToken(claims, userDetails.getUsername());
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Boolean isTokenExpired(String token) {
        Date expiration = extractExpiration(token);
        return expiration == null || !expiration.after(new Date());
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}
