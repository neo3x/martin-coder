# ============================================
# Martin-Coder API Dockerfile (Production)
# TypeScript/Bun Stack - Hono + SQLite
# ============================================

# ── Stage 1: Build ──────────────────────────────────────────
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package.json bun.lock* bun.lockb* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile --production=false

# Copy source
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
COPY tsconfig.json ./

# Build the API
RUN bun run --cwd packages/api build

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM oven/bun:1.1-alpine AS runner

WORKDIR /app

# Install system dependencies for healthcheck
RUN apk add --no-cache wget curl

# Create non-root user
RUN addgroup -S martin && adduser -S martin -G martin

# Copy built artifacts
COPY --from=builder --chown=martin:martin /app/packages/api/dist ./dist
COPY --from=builder --chown=martin:martin /app/node_modules ./node_modules
COPY --from=builder --chown=martin:martin /app/packages/shared ./packages/shared

# Create data directory for SQLite
RUN mkdir -p /data && chown martin:martin /data

USER martin

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:8000/health || exit 1

CMD ["bun", "run", "dist/index.js"]
