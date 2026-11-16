package com.sheetlite.common.response;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.List;
import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    void successUsesOkCodeAndKeepsData() {
        ApiResponse<String> response = ApiResponse.success("payload");

        assertEquals(ApiResponse.SUCCESS_CODE, response.code());
        assertEquals("payload", response.data());
        assertNull(response.details());
    }

    @Test
    void errorFallsBackToErrorCodeMessage() {
        ApiResponse<Void> response = ApiResponse.error(ErrorCode.VALIDATION_ERROR, "  ");

        assertEquals("VALIDATION_ERROR", response.code());
        assertEquals(ErrorCode.VALIDATION_ERROR.message(), response.message());
        assertNull(response.data());
    }

    @Test
    void errorKeepsCustomMessageAndFieldDetails() {
        List<ApiResponse.FieldViolation> details =
                List.of(new ApiResponse.FieldViolation("name", "不能为空"));

        ApiResponse<Void> response = ApiResponse.error(ErrorCode.VALIDATION_ERROR, "参数错误", details);

        assertEquals("参数错误", response.message());
        assertInstanceOf(List.class, response.details());
        assertEquals(1, ((List<?>) response.details()).size());
    }

    @Test
    void errorSupportsStructuredDetails() {
        ApiResponse<Void> response =
                ApiResponse.error(ErrorCode.REVISION_CONFLICT, null, java.util.Map.of("currentRevision", 13));

        assertEquals("REVISION_CONFLICT", response.code());
        assertInstanceOf(java.util.Map.class, response.details());
        assertFalse(response.message().isBlank());
    }
}
