package com.fintechdatahub.connect.rest.config;

import com.google.cloud.datastore.Datastore;
import com.google.cloud.datastore.DatastoreOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
public class DatastoreConfig {

    private static final Logger log = LoggerFactory.getLogger(DatastoreConfig.class);

    @Value("${gcp.project-id:still-nebula-505112-m8}")
    private String projectId;

    @Value("${gcp.datastore.database-id:fintechdatahub-connect-fs}")
    private String databaseId;

    @Value("${gcp.datastore.namespace:}")
    private String namespace;

    @Bean
    public Datastore datastore() {
        log.info("Initializing GCP Datastore client for Project ID: {}, Database ID: {}", projectId, databaseId);

        DatastoreOptions.Builder builder = DatastoreOptions.newBuilder()
                .setProjectId(projectId)
                .setDatabaseId(databaseId);

        if (StringUtils.hasText(namespace)) {
            log.info("Setting Datastore namespace: {}", namespace);
            builder.setNamespace(namespace);
        }

        return builder.build().getService();
    }
}
