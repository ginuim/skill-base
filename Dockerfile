# Stage 1: Build frontend (Builder)
FROM node:20-alpine AS builder

# Install pnpm (required for build scripts)
RUN npm install -g pnpm

WORKDIR /app

# Copy package.json and web directory
COPY package.json ./
COPY web/ ./web/

# Build frontend (output will be in ../static)
WORKDIR /app/web
RUN pnpm install
RUN pnpm run build

# Stage 2: Final runtime environment
FROM node:20-alpine

WORKDIR /app

# 1. Copy compiled static assets from the builder stage
COPY --from=builder /app/static ./static

# 2. Install backend production dependencies
COPY package.json ./
RUN npm install --production

# 3. Copy backend source code
COPY src/ ./src/

# Runtime configuration
RUN mkdir -p /data
ENV DATA_DIR=/data
ENV DATABASE_PATH=/data/skills.db
ENV PORT=8000
ENV APP_BASE_PATH=/

EXPOSE 8000

# Start command
CMD ["node", "src/index.js"]
