# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

# In this project, there's no actual build step for the backend
# but if there were, it would go here (e.g. npm run build)

# Stage 2: Production
FROM node:20-alpine AS production

# Install dependencies for Puppeteer to run in Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy source files from builder
COPY --from=builder /usr/src/app/src ./src

# Make sure the node user owns the app directory
RUN chown -R node:node /usr/src/app

USER node

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["npm", "start"]
