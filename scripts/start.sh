#!/bin/bash
#
# Martin-Coder Production Startup Script
# Starts both backend and frontend for production use
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

# Parse arguments
MODE="dev"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -p|--prod|--production) MODE="prod" ;;
        -h|--help)
            echo "Usage: $0 [-p|--prod]"
            echo "  -p, --prod    Run in production mode"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${BLUE}"
cat << 'EOF'
 __  __    _    ____ _____ ___ _   _        ____ ___  ____  _____ ____
|  \/  |  / \  |  _ \_   _|_ _| \ | |      / ___/ _ \|  _ \| ____|  _ \
| |\/| | / _ \ | |_) || |  | ||  \| |_____| |  | | | | | | |  _| | |_) |
| |  | |/ ___ \|  _ < | |  | || |\  |_____| |__| |_| | |_| | |___|  _ <
|_|  |_/_/   \_\_| \_\|_| |___|_| \_|      \____\___/|____/|_____|_| \_\
EOF
echo -e "${NC}"

# Check if .env exists
if [ ! -f "$ROOT_DIR/.env" ]; then
    if [ -f "$ROOT_DIR/.env.example" ]; then
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
        echo -e "${YELLOW}Please edit .env with your configuration.${NC}"
        echo -e "${YELLOW}Press Enter to continue after editing...${NC}"
        read
    else
        echo -e "${RED}.env file not found!${NC}"
        exit 1
    fi
fi

# Source environment
export $(grep -v '^#' "$ROOT_DIR/.env" | xargs)

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down Martin-Coder...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Starting in ${MODE} mode...${NC}"
echo ""

# Start backend
echo -e "${BLUE}[1/2] Starting backend server...${NC}"
cd "$ROOT_DIR/apps/api"

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

if [ "$MODE" == "prod" ]; then
    # Production mode
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 &
else
    # Development mode
    python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
fi
BACKEND_PID=$!

echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Failed to start backend!${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Backend running at http://localhost:8000${NC}"

# Start frontend
echo -e "${BLUE}[2/2] Starting frontend server...${NC}"
cd "$ROOT_DIR/apps/web"

if [ "$MODE" == "prod" ]; then
    # Production mode - build and serve
    echo -e "${YELLOW}Building frontend for production...${NC}"
    npm run build
    npm run start &
else
    # Development mode
    npm run dev &
fi
FRONTEND_PID=$!

echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Failed to start frontend!${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}  ✓ Frontend running at http://localhost:3005${NC}"

# Print access info
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║                 MARTIN-CODER RUNNING                         ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  Mode:           ${MODE}                                           ║${NC}"
echo -e "${GREEN}║  Web Interface:  http://localhost:3005                       ║${NC}"
echo -e "${GREEN}║  API:            http://localhost:8000                       ║${NC}"
echo -e "${GREEN}║  API Docs:       http://localhost:8000/docs                  ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop                                        ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
