/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.fintechdatahub.connect.rest.controller;

import com.fintechdatahub.connect.rest.dto.NewsItemDto;
import com.fintechdatahub.connect.rest.service.NewsDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class NewsDataControllerTest {

    @Mock
    private NewsDataService newsDataService;

    @InjectMocks
    private NewsDataController newsDataController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(newsDataController).build();
    }

    @Test
    void shouldReturnNewsData() throws Exception {
        NewsItemDto newsItem = new NewsItemDto(
                1L,
                "2026-08-01T10:30:00+02:00",
                "Titolo di test",
                "Sommario di test",
                "Contenuto di test",
                "Fonte di test"
        );
        when(newsDataService.fetchNewsData()).thenReturn(List.of(newsItem));

        mockMvc.perform(get("/api/v1/data"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Titolo di test"))
                .andExpect(jsonPath("$[0].published_at").value("2026-08-01T10:30:00+02:00"));
    }
}
