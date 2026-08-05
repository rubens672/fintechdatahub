package com.fintechdatahub.connect.rest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NewsItemDto(
        Long id,
        @JsonProperty("published_at") String publishedAt,
        String title,
        String summary,
        String content,
        String source
) {}
