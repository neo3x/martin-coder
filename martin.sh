#!/bin/bash

# ============================================
# Martin-Coder - Management Script
# ============================================
# Unified script for managing Martin-Coder Docker services
# Usage: ./martin.sh [start|stop|restart|status|logs|build|help]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect docker compose command
detect_docker_compose() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command_exists docker-compose; then
        echo "docker-compose"
    else
        print_error "Docker Compose is not installed"
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

# Show help
show_help() {
    print_header "Martin-Coder Management Script"

    echo -e "${CYAN}Usage:${NC}"
    echo -e "  ./martin.sh [command]"
    echo ""

    echo -e "${CYAN}Commands:${NC}"
    echo -e "  ${GREEN}start${NC}      Start all services (builds if needed, creates .env)"
    echo -e "  ${GREEN}stop${NC}       Stop all services (interactive - preserve or remove data)"
    echo -e "  ${GREEN}restart${NC}    Restart all services"
    echo -e "  ${GREEN}status${NC}     Show status and health of all services"
    echo -e "  ${GREEN}logs${NC}       View logs (add service name to filter: logs api)"
    echo -e "  ${GREEN}build${NC}      Rebuild all containers"
    echo -e "  ${GREEN}clean${NC}      Stop and remove all containers and data"
    echo -e "  ${GREEN}shell${NC}      Access container shell (usage: shell api|web|postgres|redis)"
    echo -e "  ${GREEN}help${NC}       Show this help message"
    echo ""

    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ./martin.sh start           # Start all services"
    echo -e "  ./martin.sh status          # Check service status"
    echo -e "  ./martin.sh logs api        # View API logs"
    echo -e "  ./martin.sh shell api       # Access API container"
    echo -e "  ./martin.sh restart         # Restart all services"
    echo ""

    echo -e "${CYAN}Quick URLs:${NC}"
    echo -e "  Web UI:      ${BLUE}http://localhost:3000${NC}"
    echo -e "  API:         ${BLUE}http://localhost:8000${NC}"
    echo -e "  API Docs:    ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
}

# Start services
start_services() {
    print_header "Martin-Coder - Starting Services"

    check_prerequisites
    DOCKER_COMPOSE=$(detect_docker_compose)

    print_info "Checking prerequisites..."
    print_success "Docker found: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"

    if docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose found: $(docker compose version --short)"
    else
        print_success "Docker Compose found: $(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)"
    fi

    echo ""

    # Check if .env exists
    if [ ! -f .env ]; then
        print_info "Creating .env file from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success ".env file created"
            print_warning "Please edit .env file with your API keys before running in production"
            echo ""

            read -p "Do you want to edit .env file now? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if command_exists nano; then
                    nano .env
                elif command_exists vim; then
                    vim .env
                elif command_exists vi; then
                    vi .env
                else
                    print_warning "No text editor found. Please edit .env manually."
                fi
            fi
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_success ".env file already exists"
    fi

    echo ""

    # Stop existing containers if running
    print_info "Stopping existing containers (if any)..."
    $DOCKER_COMPOSE down 2>/dev/null || true
    print_success "Stopped existing containers"

    echo ""

    # Check and generate package-lock.json if needed
    if [ ! -f apps/web/package-lock.json ]; then
        print_info "Generating package-lock.json for web application..."
        if [ -f apps/web/package.json ]; then
            cd apps/web && npm install --package-lock-only && cd ../.. || true
            print_success "package-lock.json generated"
        fi
    fi

    # Build containers
    print_info "Building Docker containers (this may take a few minutes)..."
    if $DOCKER_COMPOSE build; then
        print_success "Docker containers built successfully"
    else
        print_error "Failed to build Docker containers"
        exit 1
    fi

    echo ""

    # Start containers
    print_info "Starting all services..."
    if $DOCKER_COMPOSE up -d; then
        print_success "All services started successfully"
    else
        print_error "Failed to start services"
        exit 1
    fi

    echo ""

    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    sleep 5

    # Check service health
    print_info "Checking service status..."
    $DOCKER_COMPOSE ps

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Martin-Coder is running!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "Web UI:      ${BLUE}http://localhost:3000${NC}"
    echo -e "API:         ${BLUE}http://localhost:8000${NC}"
    echo -e "API Docs:    ${BLUE}http://localhost:8000/docs${NC}"
    echo ""
    echo "Useful commands:"
    echo -e "  View logs:       ${YELLOW}./martin.sh logs${NC}"
    echo -e "  Check status:    ${YELLOW}./martin.sh status${NC}"
    echo -e "  Stop services:   ${YELLOW}./martin.sh stop${NC}"
    echo -e "  Restart:         ${YELLOW}./martin.sh restart${NC}"
    echo ""

    # Ask if user wants to view logs
    read -p "Do you want to view logs now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        $DOCKER_COMPOSE logs -f
    fi
}

# Stop services
stop_services() {
    print_header "Martin-Coder - Stop Services"

    DOCKER_COMPOSE=$(detect_docker_compose)

    echo -e "${YELLOW}What would you like to do?${NC}"
    echo "1) Stop services (keep data)"
    echo "2) Stop and remove containers, volumes and data"
    echo "3) Cancel"
    echo ""
    read -p "Select an option (1-3): " -n 1 -r
    echo ""
    echo ""

    case $REPLY in
        1)
            print_info "Stopping all services..."
            if $DOCKER_COMPOSE down; then
                print_success "All services stopped successfully"
                print_info "Data volumes preserved"
            else
                print_error "Failed to stop services"
                exit 1
            fi
            ;;
        2)
            print_warning "This will delete all data including databases!"
            read -p "Are you sure? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "Stopping and removing all services and data..."
                if $DOCKER_COMPOSE down -v; then
                    print_success "All services and data removed successfully"
                else
                    print_error "Failed to remove services"
                    exit 1
                fi
            else
                print_info "Operation cancelled"
            fi
            ;;
        3)
            print_info "Operation cancelled"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac

    echo ""
    print_success "Done!"
}

# Restart services
restart_services() {
    print_header "Martin-Coder - Restart Services"

    DOCKER_COMPOSE=$(detect_docker_compose)

    print_info "Restarting all services..."
    if $DOCKER_COMPOSE restart; then
        print_success "All services restarted successfully"
        echo ""
        $DOCKER_COMPOSE ps
    else
        print_error "Failed to restart services"
        exit 1
    fi
}

# Show status
show_status() {
    print_header "Martin-Coder - Service Status"

    DOCKER_COMPOSE=$(detect_docker_compose)

    print_info "Container Status:"
    echo ""
    $DOCKER_COMPOSE ps
    echo ""

    print_info "Service URLs:"
    echo ""
    echo -e "  Web UI:      ${BLUE}http://localhost:3000${NC}"
    echo -e "  API:         ${BLUE}http://localhost:8000${NC}"
    echo -e "  API Docs:    ${BLUE}http://localhost:8000/docs${NC}"
    echo -e "  PostgreSQL:  ${BLUE}localhost:5432${NC}"
    echo -e "  Redis:       ${BLUE}localhost:6379${NC}"
    echo ""

    # Test API endpoint
    print_info "Health Checks:"
    if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "API is responding"
    else
        print_warning "API is not responding"
    fi

    if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Web UI is responding"
    else
        print_warning "Web UI is not responding"
    fi
    echo ""

    # Show resource usage
    print_info "Resource Usage:"
    echo ""
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
        $(docker ps --format '{{.Names}}' | grep martin-coder) 2>/dev/null || echo "No containers running"
    echo ""

    # Options
    echo -e "${YELLOW}Quick Actions:${NC}"
    echo "  [l] View logs    [r] Restart    [s] Stop    [q] Quit"
    echo ""
    read -p "Select option: " -n 1 -r
    echo ""

    case $REPLY in
        l|L)
            echo ""
            $DOCKER_COMPOSE logs -f
            ;;
        r|R)
            restart_services
            ;;
        s|S)
            stop_services
            ;;
        q|Q)
            print_info "Goodbye!"
            ;;
        *)
            print_info "Invalid option"
            ;;
    esac
}

# View logs
view_logs() {
    DOCKER_COMPOSE=$(detect_docker_compose)

    if [ -n "$1" ]; then
        print_info "Viewing logs for: $1"
        $DOCKER_COMPOSE logs -f "$1"
    else
        print_info "Viewing all logs (Ctrl+C to exit)"
        $DOCKER_COMPOSE logs -f
    fi
}

# Build containers
build_containers() {
    print_header "Martin-Coder - Build Containers"

    DOCKER_COMPOSE=$(detect_docker_compose)

    # Check and generate package-lock.json if needed
    if [ ! -f apps/web/package-lock.json ]; then
        print_info "Generating package-lock.json for web application..."
        if [ -f apps/web/package.json ]; then
            cd apps/web && npm install --package-lock-only && cd ../.. || true
            print_success "package-lock.json generated"
        fi
        echo ""
    fi

    print_info "Building all containers..."
    if $DOCKER_COMPOSE build; then
        print_success "All containers built successfully"
    else
        print_error "Failed to build containers"
        exit 1
    fi
}

# Clean everything
clean_all() {
    print_header "Martin-Coder - Clean All"

    DOCKER_COMPOSE=$(detect_docker_compose)

    print_warning "This will:"
    echo "  - Stop all containers"
    echo "  - Remove all containers"
    echo "  - Remove all volumes (databases, cache, etc.)"
    echo "  - Remove all networks"
    echo ""
    read -p "Are you absolutely sure? (type 'yes' to confirm): " -r
    echo ""

    if [[ $REPLY == "yes" ]]; then
        print_info "Cleaning everything..."
        $DOCKER_COMPOSE down -v
        print_success "All containers, volumes, and networks removed"
    else
        print_info "Operation cancelled"
    fi
}

# Access container shell
access_shell() {
    DOCKER_COMPOSE=$(detect_docker_compose)

    if [ -z "$1" ]; then
        print_error "Please specify a service: api, web, postgres, or redis"
        echo "Usage: ./martin.sh shell <service>"
        exit 1
    fi

    case $1 in
        api)
            print_info "Accessing API container shell..."
            $DOCKER_COMPOSE exec api bash
            ;;
        web)
            print_info "Accessing Web container shell..."
            $DOCKER_COMPOSE exec web sh
            ;;
        postgres)
            print_info "Accessing PostgreSQL..."
            $DOCKER_COMPOSE exec postgres psql -U martin -d martin_coder
            ;;
        redis)
            print_info "Accessing Redis CLI..."
            $DOCKER_COMPOSE exec redis redis-cli
            ;;
        *)
            print_error "Invalid service: $1"
            echo "Available services: api, web, postgres, redis"
            exit 1
            ;;
    esac
}

# Main script logic
main() {
    # If no arguments, show interactive menu
    if [ $# -eq 0 ]; then
        print_header "Martin-Coder Management"

        echo -e "${CYAN}Select an action:${NC}"
        echo ""
        echo "  1) Start services"
        echo "  2) Stop services"
        echo "  3) Restart services"
        echo "  4) Show status"
        echo "  5) View logs"
        echo "  6) Build containers"
        echo "  7) Clean all data"
        echo "  8) Help"
        echo "  9) Exit"
        echo ""
        read -p "Enter your choice (1-9): " -n 1 -r
        echo ""
        echo ""

        case $REPLY in
            1) start_services ;;
            2) stop_services ;;
            3) restart_services ;;
            4) show_status ;;
            5) view_logs ;;
            6) build_containers ;;
            7) clean_all ;;
            8) show_help ;;
            9) print_info "Goodbye!"; exit 0 ;;
            *) print_error "Invalid option"; exit 1 ;;
        esac
    else
        # Handle command line arguments
        case "$1" in
            start)
                start_services
                ;;
            stop)
                stop_services
                ;;
            restart)
                restart_services
                ;;
            status)
                show_status
                ;;
            logs)
                view_logs "$2"
                ;;
            build)
                build_containers
                ;;
            clean)
                clean_all
                ;;
            shell)
                access_shell "$2"
                ;;
            help|--help|-h)
                show_help
                ;;
            *)
                print_error "Unknown command: $1"
                echo ""
                show_help
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"
