package com.example.sheetlite.common.exception;

import com.example.sheetlite.common.response.ApiResponse;
import com.example.sheetlite.common.response.ApiResponse.FieldViolation;
import com.example.sheetlite.common.response.ErrorCode;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
/**
 * 全局异常转换：业务异常映射到稳定错误码，未预期异常记录日志且不泄露堆栈。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 处理业务异常。
     *
     * @param exception 业务异常
     * @return 对应状态码的统一错误响应
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception) {
        ErrorCode errorCode = exception.errorCode();
        log.warn("business error code={} message={}", errorCode.code(), exception.getMessage());
        return ResponseEntity.status(errorCode.status())
                .body(ApiResponse.error(errorCode, exception.getMessage()));
    }

    /**
     * 处理请求体字段校验失败。
     *
     * @param exception 校验异常
     * @return 400 统一错误响应
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception) {
        List<FieldViolation> details = exception.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldViolation)
                .toList();
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status())
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, null, details));
    }

    /**
     * 处理方法参数校验失败（{@code @Validated} 注解路径）。
     *
     * @param exception 校验异常
     * @return 400 统一错误响应
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleHandlerMethodValidation(
            HandlerMethodValidationException exception) {
        List<FieldViolation> details = exception.getParameterValidationResults().stream()
                .flatMap(result -> {
                    String parameterName = result.getMethodParameter().getParameterName();
                    return result.getResolvableErrors().stream()
                            .map(error -> new FieldViolation(parameterName, error.getDefaultMessage()));
                })
                .toList();
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status())
                .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR, null, details));
    }

    /**
     * 处理未知路径。
     *
     * @param exception 资源不存在异常
     * @return 404 统一错误响应
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(NoResourceFoundException exception) {
        log.warn("resource not found: {}", exception.getResourcePath());
        return ResponseEntity.status(ErrorCode.RESOURCE_NOT_FOUND.status())
                .body(ApiResponse.error(ErrorCode.RESOURCE_NOT_FOUND));
    }

    /**
     * 处理不支持的请求方法。
     *
     * @param exception 方法不支持异常
     * @return 405 统一错误响应
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException exception) {
        log.warn("method not allowed: {}", exception.getMethod());
        return ResponseEntity.status(ErrorCode.METHOD_NOT_ALLOWED.status())
                .body(ApiResponse.error(ErrorCode.METHOD_NOT_ALLOWED));
    }

    /**
     * 兜底处理未预期异常。
     *
     * @param exception 未预期异常
     * @return 500 统一错误响应
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpectedException(Exception exception) {
        log.error("unexpected error", exception);
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.status())
                .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR));
    }

    private FieldViolation toFieldViolation(FieldError fieldError) {
        return new FieldViolation(fieldError.getField(), fieldError.getDefaultMessage());
    }
}
