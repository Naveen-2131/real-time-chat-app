# Build stage (Updated to Node 20)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.jso[n] ./
# Robust install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

# Runner stage
FROM nginx:alpine AS runner
# Create nginx config inline
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    gzip on; gzip_types text/plain text/css application/json application/javascript; \
    location / { try_files $uri $uri/ /index.html; } \
    location /health { return 200 "healthy\n"; } \
}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
