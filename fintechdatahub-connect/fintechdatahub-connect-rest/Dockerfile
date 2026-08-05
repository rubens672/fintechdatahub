# Stage 1: Build application with Maven using root parent POM
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY fintechdatahub-connect-rest/pom.xml ./fintechdatahub-connect-rest/
COPY fintechdatahub-connect-webapp/pom.xml ./fintechdatahub-connect-webapp/
COPY fintechdatahub-connect-rest/src ./fintechdatahub-connect-rest/src
RUN mvn clean package -pl fintechdatahub-connect-rest -am -DskipTests

# Stage 2: Runtime environment
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/fintechdatahub-connect-rest/target/fintechdatahub-connect-rest-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8081

ENV DATA_FILE_PATH=classpath:data/sample-data.json

ENTRYPOINT ["java", "-jar", "app.jar"]
