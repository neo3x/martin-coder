#!/bin/bash
#
# Martin-Coder Installation Script
# Installs all dependencies and sets up the environment
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}"
echo "========================================================================"
echo "              MARTIN-CODER INSTALLATION"
echo "========================================================================"
echo -e "${NC}"

# Check Python version
echo -e "${BLUE}[1/5] Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}  Python not found!${NC}"
    echo -e "${YELLOW}  Please install Python 3.11+${NC}"
    exit 1
fi

PYVER=$(python3 --version | cut -d' ' -f2)
PYMAJOR=$(echo $PYVER | cut -d'.' -f1)
PYMINOR=$(echo $PYVER | cut -d'.' -f2)

if [ "$PYMAJOR" -lt 3 ] || ([ "$PYMAJOR" -eq 3 ] && [ "$PYMINOR" -lt 11 ]); then
    echo -e "${RED}  Python 3.11+ required. Found: $PYVER${NC}"
    exit 1
fi
echo -e "${GREEN}  Python $PYVER - OK${NC}"

# Check Node.js version
echo -e "${BLUE}[2/5] Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}  Node.js not found!${NC}"
    echo -e "${YELLOW}  Please install Node.js 20+${NC}"
    exit 1
fi

NODEVER=$(node --version | tr -d 'v')
NODEMAJOR=$(echo $NODEVER | cut -d'.' -f1)

if [ "$NODEMAJOR" -lt 20 ]; then
    echo -e "${RED}  Node.js 20+ required. Found: v$NODEVER${NC}"
    exit 1
fi
echo -e "${GREEN}  Node.js v$NODEVER - OK${NC}"

# Create Python virtual environment
echo -e "${BLUE}[3/5] Setting up Python environment...${NC}"
cd "$ROOT_DIR/apps/api"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}  Creating virtual environment...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate
echo -e "${YELLOW}  Installing Python dependencies...${NC}"
pip install -r requirements.txt -q
echo -e "${GREEN}  Python environment ready${NC}"

# Install Node.js dependencies
echo -e "${BLUE}[4/5] Installing Node.js dependencies...${NC}"
cd "$ROOT_DIR/apps/web"
echo -e "${YELLOW}  Running npm install...${NC}"
npm install --silent
echo -e "${GREEN}  Node.js dependencies installed${NC}"

# Setup environment file
echo -e "${BLUE}[5/5] Setting up configuration...${NC}"
cd "$ROOT_DIR"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp ".env.example" ".env"
        echo -e "${GREEN}  Created .env from template${NC}"
        echo -e "${YELLOW}  Please edit .env with your API keys${NC}"
    fi
else
    echo -e "${GREEN}  .env file already exists${NC}"
fi

# Create data directories
mkdir -p data

# Make scripts executable
chmod +x "$SCRIPT_DIR"/*.sh

echo ""
echo -e "${GREEN}========================================================================"
echo -e "              INSTALLATION COMPLETE!"
echo -e "========================================================================${NC}"
echo ""
echo -e "${GREEN}  Next steps:${NC}"
echo ""
echo -e "${BLUE}  1. Edit .env with your configuration:${NC}"
echo "     nano .env"
echo ""
echo -e "${BLUE}  2. Start the application:${NC}"
echo "     ./scripts/start.sh"
echo ""
echo -e "${BLUE}  Or run the demo:${NC}"
echo "     ./scripts/start-demo.sh"
echo ""
