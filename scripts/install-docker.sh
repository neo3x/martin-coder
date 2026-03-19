#!/bin/bash

# ============================================
# Martin-Coder Docker Installation Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "============================================"
echo "   Martin-Coder Docker Installation"
echo "============================================"
echo -e "${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker found: $(docker --version)${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${NC}"

# Copy environment file
if [ ! -f ".env" ]; then
    echo -e "\n${BLUE}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env and add your API keys before starting${NC}"
fi

# Create data directories
echo -e "\n${BLUE}Creating data directories...${NC}"
mkdir -p data/chroma
mkdir -p logs

# Development or Production?
echo -e "\n${YELLOW}Select installation type:${NC}"
echo "  1) Production (recommended)"
echo "  2) Development (with hot reload)"
read -p "Enter choice [1/2]: " choice

case $choice in
    2)
        COMPOSE_FILE="docker-compose.dev.yml"
        echo -e "\n${BLUE}Building development containers...${NC}"
        ;;
    *)
        COMPOSE_FILE="docker-compose.yml"
        echo -e "\n${BLUE}Building production containers...${NC}"
        ;;
esac

# Build containers
docker-compose -f $COMPOSE_FILE build

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Edit ${YELLOW}.env${NC} and add your API keys"
echo ""
echo -e "To start the application:"
echo -e "  ${BLUE}docker-compose -f $COMPOSE_FILE up -d${NC}"
echo ""
echo -e "To stop the application:"
echo -e "  ${BLUE}docker-compose -f $COMPOSE_FILE down${NC}"
echo ""
echo -e "To view logs:"
echo -e "  ${BLUE}docker-compose -f $COMPOSE_FILE logs -f${NC}"
echo ""
echo -e "Services will be available at:"
echo -e "  Web UI: ${BLUE}http://localhost:3005${NC}"
echo -e "  API:    ${BLUE}http://localhost:8000${NC}"
echo -e "  API Docs: ${BLUE}http://localhost:8000/docs${NC}"
if [ "$COMPOSE_FILE" == "docker-compose.dev.yml" ]; then
    echo -e "  Adminer (DB): ${BLUE}http://localhost:8080${NC}"
    echo -e "  Redis Commander: ${BLUE}http://localhost:8081${NC}"
fi
echo ""
