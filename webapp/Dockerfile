# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy sources
COPY . .

# Accept build-time API url (vacío => usa window.location.origin)
ARG VITE_API_URL=""
RUN export VITE_API_URL=${VITE_API_URL} && npm run build

# Production image
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN apk add --no-cache openssl \
 && mkdir -p /etc/nginx/certs \
 && openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout /etc/nginx/certs/localhost.key \
    -out /etc/nginx/certs/localhost.crt \
    -days 3650 \
    -subj "/CN=localhost"

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
