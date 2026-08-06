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
class UserRoleControllerTest {

    @Autowired MockMvc mvc;
    private String token() throws Exception {
        var body = "{\"username\":\"sarah.chen@company.com\",\"password\":\"demo1234\"}";
        var res = mvc.perform(post("/api/auth/login").contentType("application/json").content(body)).andReturn();
        return new com.fasterxml.jackson.databind.ObjectMapper().readTree(res.getResponse().getContentAsString()).get("data").get("token").asText();
    }

    @Test
    void users_shouldPage() throws Exception {
        String t = token();
        mvc.perform(get("/api/users").header("Authorization","Bearer "+t).param("pageNum","1").param("pageSize","2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(8))
                .andExpect(jsonPath("$.data.list.length()").value(2));
    }

    @Test
    void roles_shouldList() throws Exception {
        String t = token();
        mvc.perform(get("/api/roles").header("Authorization","Bearer "+t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(7));
    }

    @Test
    void permissions_shouldList() throws Exception {
        String t = token();
        mvc.perform(get("/api/permissions").header("Authorization","Bearer "+t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }
}
