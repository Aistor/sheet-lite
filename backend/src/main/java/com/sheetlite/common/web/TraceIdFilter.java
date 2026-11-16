package com.sheetlite.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 为每个请求建立 traceId，写入 MDC 与响应头，便于日志与前端排查关联。
 *
 * <p>只接受格式受限的客户端 traceId，避免日志注入和超长 header。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {

    /** 追踪 ID 请求/响应头。 */
    public static final String HEADER_NAME = "X-Trace-Id";

    /** MDC 键名，与日志 pattern 中的 {@code %X{traceId}} 对应。 */
    public static final String MDC_KEY = "traceId";

    private static final Pattern SAFE_TRACE_ID = Pattern.compile("^[A-Za-z0-9-]{8,64}$");

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String traceId = resolveTraceId(request.getHeader(HEADER_NAME));
        MDC.put(MDC_KEY, traceId);
        response.setHeader(HEADER_NAME, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }

    static String resolveTraceId(String clientTraceId) {
        if (clientTraceId != null && SAFE_TRACE_ID.matcher(clientTraceId).matches()) {
            return clientTraceId;
        }
        return UUID.randomUUID().toString();
    }
}
