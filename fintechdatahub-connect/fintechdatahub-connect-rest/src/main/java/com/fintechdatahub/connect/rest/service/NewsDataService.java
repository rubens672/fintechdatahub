package com.fintechdatahub.connect.rest.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintechdatahub.connect.rest.dto.NewsItemDto;
import com.fintechdatahub.connect.rest.model.NewsItem;
import com.fintechdatahub.connect.rest.repository.NewsDatastoreRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class NewsDataService {

    private static final Logger log = LoggerFactory.getLogger(NewsDataService.class);

    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final NewsDatastoreRepository newsDatastoreRepository;

    @Value("${data.file.path:classpath:data/sample-data.json}")
    private String dataFilePath;

    @Value("${gcp.datastore.import-on-startup:true}")
    private boolean importOnStartup;

    public NewsDataService(ResourceLoader resourceLoader,
                           ObjectMapper objectMapper,
                           NewsDatastoreRepository newsDatastoreRepository) {
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
        this.newsDatastoreRepository = newsDatastoreRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!importOnStartup) {
            log.info("Auto-import on startup is disabled.");
            return;
        }

        try {
            long existingCount = newsDatastoreRepository.count();
            log.info("Current news item count in Datastore: {}", existingCount);
            if (existingCount == 0) {
                log.info("Datastore is empty. Triggering automatic initial data import from template file...");
                importNewsTemplate();
            }
        } catch (Exception e) {
            log.warn("Could not check or import initial data on startup: {}", e.getMessage());
        }
    }

    public List<NewsItemDto> importNewsTemplate() {
        try {
            Resource resource = resolveTemplateResource();
            log.info("Reading news template file from: {}", resource.getDescription());

            List<NewsItemDto> dtos;
            try (InputStream inputStream = resource.getInputStream()) {
                dtos = objectMapper.readValue(inputStream, new TypeReference<List<NewsItemDto>>() {});
            }

            log.info("Parsed {} news items from file. Saving to Datastore...", dtos.size());
            List<NewsItem> itemsToSave = dtos.stream().map(NewsItem::fromDto).toList();
            List<NewsItem> savedItems = newsDatastoreRepository.saveAll(itemsToSave);
            log.info("Successfully imported {} news items into Datastore.", savedItems.size());

            return savedItems.stream().map(NewsItem::toDto).toList();

        } catch (Exception e) {
            log.error("Failed to import news template file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to import news template file: " + e.getMessage(), e);
        }
    }

    public List<NewsItemDto> fetchNewsData() {
        try {
            List<NewsItem> items = newsDatastoreRepository.findAll();
            log.info("Retrieved {} news items from Datastore", items.size());
            return items.stream().map(NewsItem::toDto).toList();
        } catch (Exception e) {
            log.error("Failed to fetch news data from Datastore: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    public Optional<NewsItemDto> getNewsById(Long id) {
        return newsDatastoreRepository.findById(id).map(NewsItem::toDto);
    }

    public NewsItemDto saveNews(NewsItemDto dto) {
        NewsItem item = NewsItem.fromDto(dto);
        NewsItem saved = newsDatastoreRepository.save(item);
        return saved.toDto();
    }

    public void deleteNews(Long id) {
        newsDatastoreRepository.deleteById(id);
    }

    private Resource resolveTemplateResource() {
        // Try file path specified in application properties
        Resource resource = resourceLoader.getResource(dataFilePath);
        if (resource.exists()) {
            return resource;
        }

        // Try direct relative path to news-template.json in parent directory
        File templateFile = new File("news-template.json");
        if (templateFile.exists()) {
            return new FileSystemResource(templateFile);
        }
        File parentTemplateFile = new File("../news-template.json");
        if (parentTemplateFile.exists()) {
            return new FileSystemResource(parentTemplateFile);
        }

        // Fallback to classpath sample-data.json
        log.warn("Template file not found on disk. Falling back to classpath default.");
        return resourceLoader.getResource("classpath:data/sample-data.json");
    }
}
