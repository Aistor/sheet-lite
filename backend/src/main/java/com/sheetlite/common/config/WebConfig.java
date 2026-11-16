package com.sheetlite.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 层配置。
 *
 * <p>仅为本地开发放开 Vite 开发服务器来源；上线前必须按实际域名收紧。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final String[] DEV_ORIGINS = {
        "http://localhost:5173", "http://127.0.0.1:5173"
    };

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(DEV_ORIGINS)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization", "X-Trace-Id")
                .exposedHeaders("X-Trace-Id")
                .maxAge(3600);
    }
}
