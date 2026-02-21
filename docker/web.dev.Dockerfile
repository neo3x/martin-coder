# ============================================
# Martin-Coder Web Dockerfile (Development)
# Next.js 14 with hot reload
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install bun for workspace:* protocol support
RUN npm install -g bun

# Copy workspace manifests
COPY package.json bun.lock* ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies with bun
RUN bun install --production=false

# Copy shared package source (web depends on it)
COPY packages/shared ./packages/shared

EXPOSE 3000

# Dev mode with hot reload (runs next dev via Node.js)
CMD ["npx", "--prefix", "packages/web", "next", "dev"]
