/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.fintechdatahub.connect.rest.controller;

import com.fintechdatahub.connect.rest.dto.NewsItemDto;
import com.fintechdatahub.connect.rest.service.NewsDataService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class NewsDataController {

    private final NewsDataService newsDataService;

    public NewsDataController(NewsDataService newsDataService) {
        this.newsDataService = newsDataService;
    }

    @GetMapping({"/data", "/news"})
    public ResponseEntity<List<NewsItemDto>> getNewsData() {
        List<NewsItemDto> data = newsDataService.fetchNewsData();
        return ResponseEntity.ok(data);
    }

    @GetMapping("/news/{id}")
    public ResponseEntity<NewsItemDto> getNewsById(@PathVariable Long id) {
        return newsDataService.getNewsById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/news/import")
    public ResponseEntity<List<NewsItemDto>> importNewsTemplate() {
        List<NewsItemDto> importedData = newsDataService.importNewsTemplate();
        return ResponseEntity.status(HttpStatus.CREATED).body(importedData);
    }

    @PostMapping("/news")
    public ResponseEntity<NewsItemDto> createNews(@RequestBody NewsItemDto dto) {
        NewsItemDto saved = newsDataService.saveNews(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/news/{id}")
    public ResponseEntity<Void> deleteNews(@PathVariable Long id) {
        newsDataService.deleteNews(id);
        return ResponseEntity.noContent().build();
    }
}
