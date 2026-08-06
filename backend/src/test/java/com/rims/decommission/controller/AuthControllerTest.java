package com.rims.decommission.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    @Test
    void login_shouldSucceedWithDemo1234() throws Exception {
        var body = "{\"username\":\"sarah.chen@company.com\",\"password\":\"demo1234\"}";
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.username").value("sarah.chen@company.com"));
    }

    @Test
    void login_shouldFailWithWrongPassword() throws Exception {
        var body = "{\"username\":\"sarah.chen@company.com\",\"password\":\"wrong\"}";
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void login_shouldFailWithEmptyUsername() throws Exception {
        var body = "{\"username\":\"\",\"password\":\"demo1234\"}";
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void userInfo_shouldRequireAuth() throws Exception {
        mvc.perform(get("/api/auth/user-info"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    void userInfo_shouldSucceedWithToken() throws Exception {
        var loginBody = "{\"username\":\"sarah.chen@company.com\",\"password\":\"demo1234\"}";
        var loginRes = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk()).andReturn();
        String token = om.readTree(loginRes.getResponse().getContentAsString()).get("data").get("token").asText();
        mvc.perform(get("/api/auth/user-info").header("Authorization","Bearer "+token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.roles[0]").value("SUPER_ADMIN"));
    }
}
