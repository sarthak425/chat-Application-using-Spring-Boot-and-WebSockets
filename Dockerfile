FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS backend-build
WORKDIR /app
COPY . .
COPY --from=frontend-build /app/frontend/dist /app/src/main/resources/static
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend-build /app/target/chatBox-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 10000
CMD ["sh", "-c", "java -Dserver.port=${PORT:-10000} -jar app.jar"]
