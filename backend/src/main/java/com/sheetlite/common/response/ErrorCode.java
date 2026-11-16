package com.sheetlite.common.response;

import org.springframework.http.HttpStatus;

/**
 * 稳定的对外错误码。
 *
 * <p>错误码是对外契约的一部分，新增或重命名需要同步 {@code docs/08-api.md}。
 */
public enum ErrorCode {

    /** 请求参数校验失败。 */
    VALIDATION_ERROR("VALIDATION_ERROR", HttpStatus.BAD_REQUEST, "请求参数校验失败"),

    /** 工作簿不存在或不可见。 */
    WORKBOOK_NOT_FOUND("WORKBOOK_NOT_FOUND", HttpStatus.NOT_FOUND, "工作簿不存在"),

    /** 没有访问该资源的权限。 */
    FORBIDDEN("FORBIDDEN", HttpStatus.FORBIDDEN, "没有访问该资源的权限"),

    /** 请求的资源不存在。 */
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND, "请求的资源不存在"),

    /** 请求方法不被支持。 */
    METHOD_NOT_ALLOWED("METHOD_NOT_ALLOWED", HttpStatus.METHOD_NOT_ALLOWED, "请求方法不被支持"),

    /** 乐观并发版本冲突。 */
    REVISION_CONFLICT("REVISION_CONFLICT", HttpStatus.CONFLICT, "数据版本冲突，请刷新后重试"),

    /** 操作范围超出服务端限制。 */
    RANGE_TOO_LARGE("RANGE_TOO_LARGE", HttpStatus.PAYLOAD_TOO_LARGE, "操作范围超出限制"),

    /** 不支持的操作类型。 */
    UNSUPPORTED_OPERATION("UNSUPPORTED_OPERATION", HttpStatus.BAD_REQUEST, "不支持的操作"),

    /** 未预期的服务端错误。 */
    INTERNAL_ERROR("INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "服务器内部错误");

    private final String code;
    private final HttpStatus status;
    private final String message;

    ErrorCode(String code, HttpStatus status, String message) {
        this.code = code;
        this.status = status;
        this.message = message;
    }

    /**
     * 机器可读错误码。
     *
     * @return 错误码字符串
     */
    public String code() {
        return code;
    }

    /**
     * 对应的 HTTP 状态。
     *
     * @return HTTP 状态
     */
    public HttpStatus status() {
        return status;
    }

    /**
     * 默认用户可见说明。
     *
     * @return 默认文案
     */
    public String message() {
        return message;
    }
}
