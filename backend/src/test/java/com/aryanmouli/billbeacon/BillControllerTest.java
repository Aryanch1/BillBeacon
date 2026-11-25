package com.aryanmouli.billbeacon;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class BillControllerTest {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void parseHappyPathInDemoMode() throws Exception {
    mockMvc.perform(post("/api/parse")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"text\": \"City Power & Light \\u2014 Amount due $142.75 due December 5, 2026\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.payee").value("City Power & Light"))
        .andExpect(jsonPath("$.amount").value(142.75))
        .andExpect(jsonPath("$.dueDate").value("2026-12-05"))
        .andExpect(jsonPath("$.demo").value(true))
        .andExpect(jsonPath("$.source").value("demo"));
  }

  @Test
  void parseEmptyTextReturns400() throws Exception {
    mockMvc.perform(post("/api/parse")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"text\": \"   \"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void parseMissingTextReturns400() throws Exception {
    mockMvc.perform(post("/api/parse")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void remindInDemoMode() throws Exception {
    mockMvc.perform(post("/api/remind")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"payee\": \"City Power & Light\", \"amount\": 142.75, "
                + "\"daysLeft\": 3, \"autopay\": false}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").exists())
        .andExpect(jsonPath("$.demo").value(true))
        .andExpect(jsonPath("$.source").value("demo"));
  }

  @Test
  void healthReturnsOkAndDemoFlag() throws Exception {
    mockMvc.perform(get("/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"))
        .andExpect(jsonPath("$.demo").value(true));
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }
}
