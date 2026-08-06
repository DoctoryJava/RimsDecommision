package com.rims.decommission.common;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ResultTest {

    @Test
    void success_shouldHaveCode200() {
        var r = Result.success("hello");
        assertThat(r.getCode()).isEqualTo(200);
        assertThat(r.getMessage()).isEqualTo("success");
        assertThat(r.getData()).isEqualTo("hello");
        assertThat(r.getTimestamp()).isPositive();
    }

    @Test
    void fail_shouldHaveGivenCode() {
        var r = Result.fail(401, "unauthorized");
        assertThat(r.getCode()).isEqualTo(401);
        assertThat(r.getMessage()).isEqualTo("unauthorized");
        assertThat(r.getData()).isNull();
    }

    @Test
    void pageResult_of_shouldWrap() {
        var pr = PageResult.of(100, java.util.List.of("a","b"), 1, 20);
        assertThat(pr.getTotal()).isEqualTo(100);
        assertThat(pr.getList()).hasSize(2);
        assertThat(pr.getPageNum()).isEqualTo(1);
    }
}
