package com.xoana;

import com.xoana.security.JwtTokenProvider;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.WeakKeyException;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtSigningKeyTests {
    private final UserDetails admin = User.withUsername("admin").password("unused").roles("ADMIN").build();

    @Test
    void omittedSecretsGenerateIndependentStableProcessKeys() {
        JwtTokenProvider firstProcess = new JwtTokenProvider("", 60000);
        JwtTokenProvider nextProcess = new JwtTokenProvider("", 60000);
        String token = firstProcess.generateToken(admin);
        assertThat(firstProcess.validateToken(token, admin)).isTrue();
        assertThat(firstProcess.validateToken(firstProcess.generateToken(admin), admin)).isTrue();
        assertThatThrownBy(() -> nextProcess.extractUsername(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void configuredSecretsAllowSharedVerification() {
        String secret = "shared-test-secret-at-least-32-utf8-bytes";
        JwtTokenProvider firstProcess = new JwtTokenProvider(secret, 60000);
        JwtTokenProvider secondProcess = new JwtTokenProvider(secret, 60000);
        assertThat(secondProcess.validateToken(firstProcess.generateToken(admin), admin)).isTrue();
    }

    @Test
    void rejectsWeakAndPreviouslyPublishedSecrets() {
        assertThatThrownBy(() -> new JwtTokenProvider("short-secret", 60000)).isInstanceOf(WeakKeyException.class);
        assertThatThrownBy(() -> new JwtTokenProvider(
                "xoanaSecretKey2024VeryLongSecretKeyForJWTSigningThatIsAtLeast256BitsLong", 60000))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
