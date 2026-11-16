package com.sheetlite.health;

import com.sheetlite.common.response.ApiResponse;
import java.time.OffsetDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 存活探针：仅表示进程可用，不代表数据库依赖就绪。
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final String applicationName;

    public HealthController(@Value("${spring.application.name:sheet-lite}") String applicationName) {
        this.applicationName = applicationName;
    }

    /**
     * 返回服务状态。
     *
     * @return 统一响应体
     */
    @GetMapping
    public ApiResponse<HealthResponse> health() {
        return ApiResponse.success(
                new HealthResponse("UP", applicationName, OffsetDateTime.now()));
    }

    /**
     * 健康检查响应体。
     *
     * @param status      服务状态
     * @param application 应用名
     * @param time        服务端时间
     */
    public record HealthResponse(String status, String application, OffsetDateTime time) {
    }
}
