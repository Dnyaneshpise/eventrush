# STAGE 1: build the jar using Maven + JDK (this image is big, but we
# throw it away after — only the final jar survives to stage 2)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests

# STAGE 2: the actual container that runs in production - just a
# small Java runtime + our jar, nothing else. This is why it's called
# "multi-stage": stage 1's tools never ship, only its output does.
FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
