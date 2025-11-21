#!/bin/bash

# ============================================
# Martin-Coder Development Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

case "$1" in
    start)
        echo -e "${BLUE}Starting development environment...${NC}"
        docker-compose -f docker-compose.dev.yml up -d
        echo -e "${GREEN}Services started!${NC}"
        echo ""
        echo "Web UI: http://localhost:3000"
        echo "API: http://localhost:8000"
        echo "API Docs: http://localhost:8000/docs"
        ;;
    stop)
        echo -e "${BLUE}Stopping development environment...${NC}"
        docker-compose -f docker-compose.dev.yml down
        echo -e "${GREEN}Services stopped!${NC}"
        ;;
    restart)
        echo -e "${BLUE}Restarting development environment...${NC}"
        docker-compose -f docker-compose.dev.yml restart
        echo -e "${GREEN}Services restarted!${NC}"
        ;;
    logs)
        docker-compose -f docker-compose.dev.yml logs -f "${@:2}"
        ;;
    build)
        echo -e "${BLUE}Building containers...${NC}"
        docker-compose -f docker-compose.dev.yml build
        echo -e "${GREEN}Build complete!${NC}"
        ;;
    shell-api)
        docker-compose -f docker-compose.dev.yml exec api bash
        ;;
    shell-web)
        docker-compose -f docker-compose.dev.yml exec web sh
        ;;
    db)
        echo -e "${BLUE}Connecting to database...${NC}"
        docker-compose -f docker-compose.dev.yml exec postgres psql -U martin martin_coder
        ;;
    migrate)
        echo -e "${BLUE}Running database migrations...${NC}"
        docker-compose -f docker-compose.dev.yml exec api alembic upgrade head
        ;;
    test-api)
        echo -e "${BLUE}Running API tests...${NC}"
        docker-compose -f docker-compose.dev.yml exec api pytest
        ;;
    test-web)
        echo -e "${BLUE}Running frontend tests...${NC}"
        docker-compose -f docker-compose.dev.yml exec web npm test
        ;;
    lint)
        echo -e "${BLUE}Running linters...${NC}"
        docker-compose -f docker-compose.dev.yml exec api ruff check .
        docker-compose -f docker-compose.dev.yml exec web npm run lint
        ;;
    clean)
        echo -e "${YELLOW}Cleaning up...${NC}"
        docker-compose -f docker-compose.dev.yml down -v
        rm -rf data/chroma/*
        echo -e "${GREEN}Cleanup complete!${NC}"
        ;;
    *)
        echo "Martin-Coder Development Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start      - Start development environment"
        echo "  stop       - Stop development environment"
        echo "  restart    - Restart services"
        echo "  logs       - View logs (add service name for specific logs)"
        echo "  build      - Rebuild containers"
        echo "  shell-api  - Open shell in API container"
        echo "  shell-web  - Open shell in Web container"
        echo "  db         - Connect to PostgreSQL"
        echo "  migrate    - Run database migrations"
        echo "  test-api   - Run API tests"
        echo "  test-web   - Run frontend tests"
        echo "  lint       - Run linters"
        echo "  clean      - Clean up (removes volumes)"
        ;;
esac
