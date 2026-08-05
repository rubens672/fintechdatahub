package com.fintechdatahub.connect.rest.controller;

import com.fintechdatahub.connect.rest.dto.NewsItemDto;
import com.fintechdatahub.connect.rest.service.NewsDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class NewsDataController {

    private final NewsDataService newsDataService;

    public NewsDataController(NewsDataService newsDataService) {
        this.newsDataService = newsDataService;
    }

    @GetMapping("/data")
    public ResponseEntity<List<NewsItemDto>> getNewsData() {
        List<NewsItemDto> data = newsDataService.fetchNewsData();
        return ResponseEntity.ok(data);
    }
}
