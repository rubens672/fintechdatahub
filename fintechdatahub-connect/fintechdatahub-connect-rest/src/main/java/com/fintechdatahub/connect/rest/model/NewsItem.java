/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.fintechdatahub.connect.rest.model;

import com.fintechdatahub.connect.rest.dto.NewsItemDto;

public class NewsItem {

    private Long id;
    private String publishedAt;
    private String title;
    private String summary;
    private String content;
    private String source;

    public NewsItem() {
    }

    public NewsItem(Long id, String publishedAt, String title, String summary, String content, String source) {
        this.id = id;
        this.publishedAt = publishedAt;
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.source = source;
    }

    public static NewsItem fromDto(NewsItemDto dto) {
        return new NewsItem(
                dto.id(),
                dto.publishedAt(),
                dto.title(),
                dto.summary(),
                dto.content(),
                dto.source()
        );
    }

    public NewsItemDto toDto() {
        return new NewsItemDto(
                this.id,
                this.publishedAt,
                this.title,
                this.summary,
                this.content,
                this.source
        );
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(String publishedAt) {
        this.publishedAt = publishedAt;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
