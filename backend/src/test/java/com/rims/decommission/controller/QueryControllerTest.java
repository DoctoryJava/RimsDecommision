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
class QueryControllerTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String token() throws Exception {
        var body = "{\"username\":\"sarah.chen@company.com\",\"password\":\"demo1234\"}";
        var res = mvc.perform(post("/api/auth/login").contentType("application/json").content(body)).andReturn();
        return om.readTree(res.getResponse().getContentAsString()).get("data").get("token").asText();
    }

    @Test
    void queryConfigs_shouldReturnTwo() throws Exception {
        String t = token();
        mvc.perform(get("/api/query-configs").header("Authorization","Bearer "+t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value("qc-001"));
    }

    @Test
    void execute_shouldReturnRows() throws Exception {
        String t = token();
        var body = "{\"configId\":\"qc-001\",\"page\":1,\"pageSize\":5}";
        mvc.perform(post("/api/query/execute").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.total").isNumber())
                .andExpect(jsonPath("$.data.list").isArray());
    }

    @Test
    void execute_shouldFilterLike() throws Exception {
        String t = token();
        var body = "{\"configId\":\"qc-001\",\"page\":1,\"pageSize\":10,\"filters\":[{\"field\":\"customer_name\",\"operator\":\"like\",\"value\":\"张\"}]}";
        mvc.perform(post("/api/query/execute").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").isNumber());
    }

    @Test
    void sas_shouldReturnUrl() throws Exception {
        String t = token();
        mvc.perform(get("/api/systems/sys-001/attachments/sas").header("Authorization","Bearer "+t).param("objectKey","test.pdf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sasUrl").isNotEmpty());
    }
}
