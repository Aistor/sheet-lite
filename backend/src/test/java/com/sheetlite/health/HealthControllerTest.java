package com.sheetlite.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.sheetlite.common.response.ApiResponse;
import org.junit.jupiter.api.Test;

class HealthControllerTest {

    private final HealthController controller = new HealthController("sheet-lite");

    @Test
    void reportsUpStatus() {
        ApiResponse<HealthController.HealthResponse> response = controller.health();

        assertEquals(ApiResponse.SUCCESS_CODE, response.code());
        assertNotNull(response.data());
        assertEquals("UP", response.data().status());
        assertEquals("sheet-lite", response.data().application());
        assertNotNull(response.data().time());
    }
}
