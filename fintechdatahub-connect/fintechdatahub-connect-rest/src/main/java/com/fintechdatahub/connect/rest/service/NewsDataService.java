package com.fintechdatahub.connect.rest.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintechdatahub.connect.rest.dto.NewsItemDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Collections;
import java.util.List;

@Service
public class NewsDataService {

    private static final Logger log = LoggerFactory.getLogger(NewsDataService.class);

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    @Value("${data.file.path}")
    private String dataFilePath;

    public NewsDataService(ResourceLoader resourceLoader, ObjectMapper objectMapper) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
    }

    public List<NewsItemDto> fetchNewsData() {
        try {
            log.info("Reading news data from path: {}", dataFilePath);
            Resource resource = resourceLoader.getResource(dataFilePath);
            if (!resource.exists()) {
                log.warn("Resource at {} does not exist. Falling back to classpath default.", dataFilePath);
                resource = resourceLoader.getResource("classpath:data/sample-data.json");
            }
            try (InputStream inputStream = resource.getInputStream()) {
                return objectMapper.readValue(inputStream, new TypeReference<List<NewsItemDto>>() {});
            }
        } catch (Exception e) {
            log.error("Failed to read or parse news data from {}: {}", dataFilePath, e.getMessage(), e);
            return Collections.emptyList();
        }
    }
}
