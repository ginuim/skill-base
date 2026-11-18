# Stage 1: Build frontend (Builder)
FROM node:20.20.2-alpine3.22 AS builder

# Install pnpm (required for build scripts)
RUN npm install -g pnpm@10.28.0

WORKDIR /app

# Copy package.json and web directory
COPY package.json ./
COPY web/ ./web/

# Build frontend (output will be in ../static)
WORKDIR /app/web
RUN pnpm install --frozen-lockfile --ignore-workspace
RUN pnpm run build

# Stage 2: Final runtime environment
FROM node:20.20.2-alpine3.22

WORKDIR /app

# 1. Copy compiled static assets from the builder stage
COPY --from=builder /app/static ./static

# 2. Install backend production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 3. Copy backend source code
COPY src/ ./src/
COPY skills/skill-base-web-deploy/ ./skills/skill-base-web-deploy/
COPY skills/skill-base-cli/ ./skills/skill-base-cli/
COPY skills/skill-base/ ./skills/skill-base/

# Runtime configuration
RUN mkdir -p /data
ENV DATA_DIR=/data
ENV DATABASE_PATH=/data/skills.db
ENV PORT=8000
ENV HOST=0.0.0.0
ENV APP_BASE_PATH=/
ENV SESSION_STORE=memory

EXPOSE 8000

# Start command
CMD ["node", "src/index.js"]
