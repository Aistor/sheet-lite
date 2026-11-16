package com.sheetlite.common.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class TraceIdFilterTest {

    @Test
    void keepsSafeClientTraceId() {
        assertEquals("abc-123-XYZ", TraceIdFilter.resolveTraceId("abc-123-XYZ"));
    }

    @Test
    void replacesUnsafeClientTraceId() {
        String resolved = TraceIdFilter.resolveTraceId("bad id with spaces");

        assertNotEquals("bad id with spaces", resolved);
        assertTrue(resolved.matches("^[A-Za-z0-9-]{8,64}$"));
    }

    @Test
    void generatesTraceIdWhenHeaderMissing() {
        String resolved = TraceIdFilter.resolveTraceId(null);

        assertTrue(resolved.matches("^[A-Za-z0-9-]{8,64}$"));
    }
}
