# Stage 1: Build application with Maven using root parent POM
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY fintechdatahub-connect-rest/pom.xml ./fintechdatahub-connect-rest/
COPY fintechdatahub-connect-webapp/pom.xml ./fintechdatahub-connect-webapp/
COPY fintechdatahub-connect-webapp/src ./fintechdatahub-connect-webapp/src
RUN mvn clean package -pl fintechdatahub-connect-webapp -am -DskipTests

# Stage 2: Runtime environment
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/fintechdatahub-connect-webapp/target/fintechdatahub-connect-webapp-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENV REST_SERVICE_URL=http://fintechdatahub-connect-rest-service:8081/api/v1/data

ENTRYPOINT ["java", "-jar", "app.jar"]
