#!/bin/bash

# ============================================
# Martin-Coder Installation Script (Native)
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
echo "   Martin-Coder Installation Script"
echo "============================================"
echo -e "${NC}"

# Check OS
OS=$(uname -s)
echo -e "${YELLOW}Detected OS: $OS${NC}"

# Check required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed${NC}"
        echo "Please install $1 and try again"
        exit 1
    else
        echo -e "${GREEN}✓ $1 found${NC}"
    fi
}

echo -e "\n${BLUE}Checking requirements...${NC}"
check_command python3
check_command pip3
check_command node
check_command npm
check_command git

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d ' ' -f 2 | cut -d '.' -f 1,2)
if [[ $(echo "$PYTHON_VERSION < 3.11" | bc -l) -eq 1 ]]; then
    echo -e "${RED}Error: Python 3.11+ required (found $PYTHON_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python version: $PYTHON_VERSION${NC}"

# Check Node version
NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [[ $NODE_VERSION -lt 20 ]]; then
    echo -e "${RED}Error: Node.js 20+ required (found v$NODE_VERSION)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version: $(node --version)${NC}"

# Create directories
echo -e "\n${BLUE}Creating directories...${NC}"
mkdir -p data/chroma
mkdir -p logs

# Setup Backend
echo -e "\n${BLUE}Setting up Backend...${NC}"
cd apps/api

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Deactivate virtual environment
deactivate
cd ../..

# Setup Frontend
echo -e "\n${BLUE}Setting up Frontend...${NC}"
cd apps/web

# Install Node dependencies
echo "Installing Node.js dependencies..."
npm install

cd ../..

# Setup CLI
echo -e "\n${BLUE}Setting up CLI...${NC}"
cd apps/cli

# Install CLI in development mode
echo "Installing CLI..."
pip3 install -e .

cd ../..

# Copy environment file
if [ ! -f ".env" ]; then
    echo -e "\n${BLUE}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env and add your API keys${NC}"
fi

# Create start scripts
echo -e "\n${BLUE}Creating start scripts...${NC}"

# Backend start script
cat > scripts/start-api.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/../apps/api"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
EOF
chmod +x scripts/start-api.sh

# Frontend start script
cat > scripts/start-web.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/../apps/web"
npm run dev
EOF
chmod +x scripts/start-web.sh

# Full stack start script
cat > scripts/start-all.sh << 'EOF'
#!/bin/bash
# Start all services in background

echo "Starting Martin-Coder..."

# Start API
./scripts/start-api.sh &
API_PID=$!

# Wait for API to be ready
sleep 5

# Start Web
./scripts/start-web.sh &
WEB_PID=$!

echo ""
echo "Services started:"
echo "  API: http://localhost:8000 (PID: $API_PID)"
echo "  Web: http://localhost:3000 (PID: $WEB_PID)"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle shutdown
trap "kill $API_PID $WEB_PID 2>/dev/null" EXIT

# Wait for both processes
wait
EOF
chmod +x scripts/start-all.sh

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}   Installation Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Edit ${YELLOW}.env${NC} and add your API keys"
echo -e "  2. Start the backend: ${BLUE}./scripts/start-api.sh${NC}"
echo -e "  3. Start the frontend: ${BLUE}./scripts/start-web.sh${NC}"
echo -e "  4. Or start everything: ${BLUE}./scripts/start-all.sh${NC}"
echo ""
echo -e "CLI usage:"
echo -e "  ${BLUE}martin-coder --help${NC}"
echo -e "  ${BLUE}martin-coder chat start${NC}"
echo -e "  ${BLUE}martin-coder ask 'How do I create a REST API?'${NC}"
echo ""
echo -e "Access the web UI at: ${BLUE}http://localhost:3000${NC}"
echo ""
