# STAGE 1: build the React app into static files (HTML/CSS/JS).
# Same "throw away the build tools in the final image" principle as
# backend/Dockerfile.
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# STAGE 2: nginx - serves the static build from stage 1 AND load
# balances /api/* across app1/app2 (see nginx.conf). This is now the
# ONE entry point into the whole app; there is no separate frontend
# container/nginx anymore.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
