#!/bin/bash
#
# Martin-Coder Demo Startup Script
# Starts both backend and frontend for demo purposes
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
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║               🚀 MARTIN-CODER DEMO 🚀                        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if demo is set up
if [ ! -d "$ROOT_DIR/demo_data" ]; then
    echo -e "${YELLOW}Demo not set up. Running setup script...${NC}"
    python3 "$SCRIPT_DIR/setup-demo.py"
fi

# Export demo mode
export DEMO_MODE=true
export DEBUG=true

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down demo...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Demo stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${BLUE}Starting backend server...${NC}"
cd "$ROOT_DIR/apps/api"

# Check if virtual environment exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to start...${NC}"
sleep 3

# Check if backend started
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Failed to start backend!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend running at http://localhost:8000${NC}"

# Start frontend
echo -e "${BLUE}Starting frontend server...${NC}"
cd "$ROOT_DIR/apps/web"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 5

# Check if frontend started
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Failed to start frontend!${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✓ Frontend running at http://localhost:3000${NC}"

# Print access info
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║                    ✅ DEMO READY! ✅                         ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  Web Interface:  http://localhost:3000                       ║${NC}"
echo -e "${GREEN}║  API Docs:       http://localhost:8000/docs                  ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  Demo Login:                                                 ║${NC}"
echo -e "${GREEN}║    Email:    demo@martin-coder.com                           ║${NC}"
echo -e "${GREEN}║    Password: demo123                                         ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop the demo                               ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
