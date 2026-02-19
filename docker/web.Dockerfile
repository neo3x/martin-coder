# ============================================
# Martin-Coder Web Dockerfile (Production)
# Next.js 14 + React 18
# ============================================

# ── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy workspace manifests
COPY package.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install --workspace=packages/web --workspace=packages/shared

# ── Stage 2: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY package.json ./
COPY packages/web ./packages/web
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run --workspace=packages/web build

# ── Stage 3: Runtime ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/public ./public

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" || exit 1

CMD ["node", "server.js"]
