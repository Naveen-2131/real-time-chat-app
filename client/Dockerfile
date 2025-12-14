# ---------------- BUILD STAGE ----------------
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------- RUNNER STAGE ----------------
FROM nginx:alpine

RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript; \
    location / { try_files $uri $uri/ /index.html; } \
    location /health { return 200 "healthy\n"; } \
}' > /etc/nginx/conf.d/default.conf

# ⚠️ Change if output is not dist
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
