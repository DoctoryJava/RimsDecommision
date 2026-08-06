package com.rims.decommission.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SystemControllerTest {

    @Autowired MockMvc mvc;

    private String token() throws Exception {
        var body = "{\"username\":\"sarah.chen@company.com\",\"password\":\"demo1234\"}";
        var res = mvc.perform(post("/api/auth/login").contentType("application/json").content(body)).andReturn();
        return new com.fasterxml.jackson.databind.ObjectMapper().readTree(res.getResponse().getContentAsString()).get("data").get("token").asText();
    }

    @Test
    void list_shouldReturnPage() throws Exception {
        String t = token();
        mvc.perform(get("/api/systems").header("Authorization","Bearer "+t).param("pageNum","1").param("pageSize","2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").value(6))
                .andExpect(jsonPath("$.data.list.length()").value(2));
    }

    @Test
    void list_shouldFilterBySearch() throws Exception {
        String t = token();
        mvc.perform(get("/api/systems").header("Authorization","Bearer "+t).param("search","COP"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].code").value("COP"));
    }

    @Test
    void detail_shouldReturnOne() throws Exception {
        String t = token();
        mvc.perform(get("/api/systems/sys-001").header("Authorization","Bearer "+t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("sys-001"));
    }

    @Test
    void create_shouldEcho() throws Exception {
        String t = token();
        var body = "{\"name\":\"Test System\",\"code\":\"TST\",\"stage\":\"active\"}";
        mvc.perform(post("/api/systems").header("Authorization","Bearer "+t).contentType("application/json").content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Test System"));
    }

    @Test
    void status_shouldReturn() throws Exception {
        String t = token();
        mvc.perform(get("/api/systems/sys-001/status").header("Authorization","Bearer "+t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.systemId").value("sys-001"));
    }
}
