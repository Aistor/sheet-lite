package com.example.sheetlite.common.exception;

import com.example.sheetlite.common.response.ErrorCode;
import java.util.Objects;

/**
 * 可预期的业务异常，由 {@link GlobalExceptionHandler} 转换为统一错误响应。
 */
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    /**
     * 使用错误码默认文案构造业务异常。
     *
     * @param errorCode 错误码
     */
    public BusinessException(ErrorCode errorCode) {
        this(errorCode, null, null);
    }

    /**
     * 构造业务异常。
     *
     * @param errorCode 错误码
     * @param message   自定义说明，为空时使用错误码默认文案
     */
    public BusinessException(ErrorCode errorCode, String message) {
        this(errorCode, message, null);
    }

    /**
     * 构造业务异常。
     *
     * @param errorCode 错误码
     * @param message   自定义说明，为空时使用错误码默认文案
     * @param cause     根因
     */
    public BusinessException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = Objects.requireNonNull(errorCode, "errorCode must not be null");
    }

    /**
     * 业务错误码。
     *
     * @return 错误码
     */
    public ErrorCode errorCode() {
        return errorCode;
    }
}
