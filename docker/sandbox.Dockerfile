# ============================================
# Martin-Coder Sandbox Dockerfile
# Multi-language code execution environment
# ============================================

FROM ubuntu:22.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies and add Python 3.11 PPA
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    gnupg \
    && add-apt-repository -y ppa:deadsnakes/ppa || true \
    && apt-get update \
    && rm -rf /var/lib/apt/lists/*

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
    # Python 3.11 from deadsnakes PPA
    python3.11 \
    python3.11-venv \
    python3.11-dev \
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
    && rm -rf /var/lib/apt/lists/* || true

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 || true \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 || true

# Install additional Python packages (with --break-system-packages for newer pip)
RUN pip3 install --no-cache-dir --break-system-packages \
    pytest \
    black \
    ruff \
    mypy \
    poetry \
    || pip3 install --no-cache-dir \
    pytest \
    black \
    ruff \
    mypy \
    poetry \
    || true

# Install Node.js LTS via n
RUN npm install -g n || true \
    && n lts || true \
    && npm install -g \
    typescript \
    ts-node \
    prettier \
    eslint \
    pnpm \
    yarn \
    || true

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
