# ============================================
# Martin-Coder Sandbox Dockerfile
# Multi-language code execution environment
# ============================================

FROM ubuntu:22.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools
    build-essential \
    cmake \
    # Version control
    git \
    # Network tools
    curl \
    wget \
    # Python
    python3.11 \
    python3.11-venv \
    python3-pip \
    # Node.js
    nodejs \
    npm \
    # Java
    default-jdk \
    # Go
    golang-go \
    # Rust
    rustc \
    cargo \
    # Ruby
    ruby \
    ruby-dev \
    # PHP
    php \
    php-cli \
    # Docker CLI (for nested containers if needed)
    docker.io \
    # Utilities
    zip \
    unzip \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install additional Python packages
RUN pip3 install --no-cache-dir \
    pytest \
    black \
    ruff \
    mypy \
    poetry

# Install Node.js LTS via n
RUN npm install -g n && n lts && npm install -g \
    typescript \
    ts-node \
    prettier \
    eslint \
    pnpm \
    yarn

# Create sandbox user
RUN useradd -m -s /bin/bash sandbox && \
    mkdir -p /sandboxes && \
    chown sandbox:sandbox /sandboxes

# Set working directory
WORKDIR /sandboxes

# Switch to sandbox user
USER sandbox

# Default command
CMD ["tail", "-f", "/dev/null"]
