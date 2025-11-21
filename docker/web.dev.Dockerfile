# ============================================
# Martin-Coder Web Dockerfile (Development)
# ============================================

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/web/package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Expose port
EXPOSE 3000

# Run in development mode
CMD ["npm", "run", "dev"]
