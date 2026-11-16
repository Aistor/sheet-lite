package com.example.sheetlite.common.response;

import java.util.Objects;
import org.slf4j.MDC;

/**
 * 统一 API 响应体。
 *
 * <p>成功响应 {@code code} 固定为 {@code OK}；错误响应携带稳定错误码、可选字段校验明细和 traceId。
 *
 * @param code    机器可读的业务码
 * @param message 面向调用方的简短说明
 * @param data    业务数据，错误响应为 {@code null}
 * @param traceId 请求追踪 ID，与响应头 {@code X-Trace-Id} 一致
 * @param details 错误明细：字段校验时为 {@link FieldViolation} 列表，其他错误可为结构化对象（如当前 revision）
 */
public record ApiResponse<T>(
        String code,
        String message,
        T data,
        String traceId,
        Object details) {

    /** 成功响应码。 */
    public static final String SUCCESS_CODE = "OK";

    private static final String TRACE_ID_MDC_KEY = "traceId";

    public ApiResponse {
        Objects.requireNonNull(code, "code must not be null");
        Objects.requireNonNull(message, "message must not be null");
    }

    /**
     * 构造成功响应。
     *
     * @param data 业务数据
     * @param <T>  数据类型
     * @return 成功响应
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(SUCCESS_CODE, SUCCESS_CODE, data, currentTraceId(), null);
    }

    /**
     * 构造错误响应，使用错误码自带的默认文案。
     *
     * @param errorCode 错误码
     * @param <T>       数据类型
     * @return 错误响应
     */
    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return error(errorCode, null, null);
    }

    /**
     * 构造错误响应。
     *
     * @param errorCode 错误码
     * @param message   自定义说明，为空时使用错误码默认文案
     * @param <T>       数据类型
     * @return 错误响应
     */
    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message) {
        return error(errorCode, message, null);
    }

    /**
     * 构造带明细的错误响应。
     *
     * @param errorCode 错误码
     * @param message   自定义说明，为空时使用错误码默认文案
     * @param details   错误明细，可为 {@code null}
     * @param <T>       数据类型
     * @return 错误响应
     */
    public static <T> ApiResponse<T> error(
            ErrorCode errorCode, String message, Object details) {
        Objects.requireNonNull(errorCode, "errorCode must not be null");
        String resolvedMessage = (message == null || message.isBlank()) ? errorCode.message() : message;
        return new ApiResponse<>(errorCode.code(), resolvedMessage, null, currentTraceId(), details);
    }

    /**
     * 字段级校验错误明细。
     *
     * @param field   字段名
     * @param message 校验失败说明
     */
    public record FieldViolation(String field, String message) {
    }

    private static String currentTraceId() {
        return MDC.get(TRACE_ID_MDC_KEY);
    }
}
