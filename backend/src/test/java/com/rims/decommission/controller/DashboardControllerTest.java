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
class DashboardControllerTest {

    @Autowired MockMvc mvc;
    private String token() throws Exception {
        var body = "{\"username\":\"sarah.chen@company.com\",\"password\":\"demo1234\"}";
        var res = mvc.perform(post("/api/auth/login").contentType("application/json").content(body)).andReturn();
        return new com.fasterxml.jackson.databind.ObjectMapper().readTree(res.getResponse().getContentAsString()).get("data").get("token").asText();
    }

    @Test
    void stats_shouldReturnCounts() throws Exception {
        String t = token();
        mvc.perform(get("/api/systems/stats").header("Authorization","Bearer "+t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(6))
                .andExpect(jsonPath("$.data.active").isNumber());
    }

    @Test
    void storageUsage_shouldReturnList() throws Exception {
        String t = token();
        mvc.perform(get("/api/storage/usage").header("Authorization","Bearer "+t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(6));
    }
}
