# ============================================
# Martin-Coder API Dockerfile (Development)
# TypeScript/Bun Stack - Hono + SQLite
# Hot reload via bun --watch
# ============================================

FROM oven/bun:1.1-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache wget curl git

# Copy workspace manifests (for initial install)
COPY package.json bun.lock* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install all dependencies
RUN bun install --production=false

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8000

# Dev mode with hot reload
CMD ["bun", "run", "--watch", "packages/api/src/index.ts"]
