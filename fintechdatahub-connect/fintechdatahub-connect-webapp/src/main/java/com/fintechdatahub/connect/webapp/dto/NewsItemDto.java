/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.fintechdatahub.connect.webapp.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NewsItemDto(
        Long id,
        @JsonProperty("published_at") String publishedAt,
        String title,
        String summary,
        String content,
        String source
) {}
