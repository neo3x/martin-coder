# ============================================
# Martin-Coder Web Dockerfile (Development)
# Next.js 14 with hot reload
# ============================================

FROM node:20-alpine

WORKDIR /app

# Copy workspace manifests
COPY package.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including dev)
RUN npm install --workspace=packages/web --workspace=packages/shared

EXPOSE 3000

# Dev mode with hot reload
CMD ["npm", "run", "--workspace=packages/web", "dev"]
