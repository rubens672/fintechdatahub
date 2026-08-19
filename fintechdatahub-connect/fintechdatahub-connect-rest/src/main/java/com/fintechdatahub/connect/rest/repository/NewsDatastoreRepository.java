/*
 * Copyright (c) 2026 Berti AI & Cloud Architecture. All rights reserved.
 */
package com.fintechdatahub.connect.rest.repository;

import com.fintechdatahub.connect.rest.model.NewsItem;
import com.google.cloud.datastore.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class NewsDatastoreRepository {

    private static final Logger log = LoggerFactory.getLogger(NewsDatastoreRepository.class);
    private static final String KIND = "NewsItem";

    private final Datastore datastore;

    public NewsDatastoreRepository(Datastore datastore) {
        this.datastore = datastore;
    }

    public NewsItem save(NewsItem item) {
        KeyFactory keyFactory = datastore.newKeyFactory().setKind(KIND);
        Key key;

        if (item.getId() != null) {
            key = keyFactory.newKey(item.getId());
        } else {
            IncompleteKey incompleteKey = keyFactory.newKey();
            key = datastore.allocateId(incompleteKey);
            item.setId(key.getId());
        }

        Entity entity = Entity.newBuilder(key)
                .set("published_at", item.getPublishedAt() != null ? item.getPublishedAt() : "")
                .set("title", item.getTitle() != null ? item.getTitle() : "")
                .set("summary", item.getSummary() != null ? item.getSummary() : "")
                .set("content", StringValue.newBuilder(item.getContent() != null ? item.getContent() : "").setExcludeFromIndexes(true).build())
                .set("source", item.getSource() != null ? item.getSource() : "")
                .build();

        datastore.put(entity);
        log.info("Saved NewsItem with ID: {} to Datastore", key.getId());
        return item;
    }

    public List<NewsItem> saveAll(List<NewsItem> items) {
        List<NewsItem> savedItems = new ArrayList<>();
        for (NewsItem item : items) {
            savedItems.add(save(item));
        }
        return savedItems;
    }

    public Optional<NewsItem> findById(Long id) {
        Key key = datastore.newKeyFactory().setKind(KIND).newKey(id);
        Entity entity = datastore.get(key);

        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(mapEntityToNewsItem(entity));
    }

    public List<NewsItem> findAll() {
        Query<Entity> query = Query.newEntityQueryBuilder()
                .setKind(KIND)
                .build();

        QueryResults<Entity> results = datastore.run(query);
        List<NewsItem> list = new ArrayList<>();
        while (results.hasNext()) {
            Entity entity = results.next();
            list.add(mapEntityToNewsItem(entity));
        }
        return list;
    }

    public void deleteById(Long id) {
        Key key = datastore.newKeyFactory().setKind(KIND).newKey(id);
        datastore.delete(key);
        log.info("Deleted NewsItem with ID: {} from Datastore", id);
    }

    public long count() {
        Query<Entity> query = Query.newEntityQueryBuilder().setKind(KIND).build();
        QueryResults<Entity> results = datastore.run(query);
        long c = 0;
        while (results.hasNext()) {
            results.next();
            c++;
        }
        return c;
    }

    private NewsItem mapEntityToNewsItem(Entity entity) {
        NewsItem item = new NewsItem();
        item.setId(entity.getKey().getId());
        item.setPublishedAt(entity.contains("published_at") ? entity.getString("published_at") : null);
        item.setTitle(entity.contains("title") ? entity.getString("title") : null);
        item.setSummary(entity.contains("summary") ? entity.getString("summary") : null);
        item.setContent(entity.contains("content") ? entity.getString("content") : null);
        item.setSource(entity.contains("source") ? entity.getString("source") : null);
        return item;
    }
}
