/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.fintechdatahub.connect.webapp.service;

import com.fintechdatahub.connect.webapp.dto.NewsItemDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

@Service
public class NewsRestConsumerService {

    private static final Logger log = LoggerFactory.getLogger(NewsRestConsumerService.class);

    private final RestTemplate restTemplate;

    @Value("${rest.service.url}")
    private String restServiceUrl;

    public NewsRestConsumerService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<NewsItemDto> fetchNewsFromRestService() {
        try {
            log.info("Fetching news data from REST service endpoint: {}", restServiceUrl);
            ResponseEntity<List<NewsItemDto>> response = restTemplate.exchange(
                    restServiceUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<NewsItemDto>>() {}
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.error("Error consuming REST service at {}: {}", restServiceUrl, e.getMessage(), e);
        }
        return Collections.emptyList();
    }
}
