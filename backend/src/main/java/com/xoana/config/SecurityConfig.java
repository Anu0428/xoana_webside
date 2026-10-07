package com.xoana.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xoana.dto.ApiResponse;
import com.xoana.security.JwtAuthFilter;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final ObjectMapper objectMapper;
    private final String allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, UserDetailsService userDetailsService,
                          ObjectMapper objectMapper,
                          @Value("${app.cors.allowed-origins:http://localhost:3000}") String allowedOrigins) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
        this.objectMapper = objectMapper;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // Check administrative paths before the public catalog rules.
                        .requestMatchers("/api/admin/**", "/api/products/all", "/api/articles/admin/**",
                                "/api/users/admin/**", "/api/orders/admin/**", "/api/orders/*/status",
                                "/api/traffic/stats").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register",
                                "/api/traffic/track").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/featured",
                                "/api/products/{id}", "/api/articles", "/api/articles/recent",
                                "/api/articles/{id}", "/api/settings", "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/api/products", "/api/products/featured",
                                "/api/products/{id}", "/api/articles", "/api/articles/recent",
                                "/api/articles/{id}", "/api/settings", "/uploads/**").permitAll()
                        .requestMatchers("/api/products/**", "/api/articles/**", "/api/settings")
                                .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/me", "/api/orders/my")
                                .hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/api/users/me").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.POST, "/api/orders", "/api/orders/*/pay", "/api/contact")
                                .hasAnyRole("ADMIN", "USER")
                        .requestMatchers("/api/contact/**").hasRole("ADMIN")
                        .anyRequest().denyAll()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(401);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getOutputStream(),
                                    ApiResponse.error("Authentication required"));
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getOutputStream(),
                                    ApiResponse.error("Administrator access required"));
                        }))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim)
                .filter(origin -> !origin.isEmpty()).distinct().toList());
        configuration.setAllowedMethods(Arrays.asList("GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}



