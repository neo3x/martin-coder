#!/bin/bash

# ============================================
# Martin-Coder v2.0 - Management Script
# TypeScript/Bun Stack | Smart Rebuild + Health Guardrails
# ============================================
# Usage: ./martin.sh [command]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
DIM='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

# State
DOCKER_COMPOSE=""
REBUILD_API=0
REBUILD_WEB=0
REBUILD_INFRA=0

# ============================================
# UI Helpers
# ============================================
print_header() {
    echo ""
    echo -e "${BLUE}${BOLD}------------------------------------------------------------${NC}"
    echo -e "${BLUE}${BOLD} $1${NC}"
    echo -e "${BLUE}${BOLD}------------------------------------------------------------${NC}"
    echo ""
}

print_banner() {
    clear
    echo -e "${CYAN}${BOLD}============================================================${NC}"
    echo -e "${CYAN}${BOLD}             Martin-Coder v2.0 Manager                      ${NC}"
    echo -e "${CYAN}${BOLD}          TypeScript / Bun / Hono / Next.js                 ${NC}"
    echo -e "${CYAN}${BOLD}============================================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERR ]${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

# ============================================
# Prerequisites
# ============================================
check_prerequisites() {
    if ! command_exists docker; then
        print_error "Docker is not installed."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

detect_docker_compose() {
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
    elif command_exists docker-compose; then
        DOCKER_COMPOSE="docker-compose"
    else
        print_error "Docker Compose is not installed."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

check_bun() {
    if ! command_exists bun; then
        print_error "Bun is not installed (required for local dev)."
        echo "Visit: https://bun.sh/docs/installation"
        exit 1
    fi
}

ensure_env() {
    if [ -f .env ]; then
        print_success ".env file already exists"
        return 0
    fi

    print_info "Creating .env from .env.example..."
    if [ ! -f .env.example ]; then
        print_error ".env.example not found"
        exit 1
    fi

    cp .env.example .env
    print_success ".env created"
    print_warning "Review .env values before production use"
    print_warning "At minimum, set SECRET_KEY and your AI provider API keys"

    read -p "Edit .env file now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command_exists nano; then nano .env
        elif command_exists vim; then vim .env
        elif command_exists vi; then vi .env
        else print_warning "No editor found. Edit .env manually."
        fi
    fi
}

ensure_dependencies() {
    [ -d node_modules ] && return 0
    [ ! -f package.json ] && return 0

    print_info "Installing dependencies with bun..."
    bun install || { print_warning "Could not install dependencies automatically"; return 0; }
    print_success "Dependencies installed"
}

# ============================================
# Smart Rebuild Detection
# ============================================
reset_rebuild_flags() {
    REBUILD_API=0
    REBUILD_WEB=0
    REBUILD_INFRA=0
}

classify_path() {
    local p="$1"
    [[ -z "$p" ]] && return

    # Core package changes
    [[ "$p" == packages/api/* ]]    && REBUILD_API=1
    [[ "$p" == packages/web/* ]]    && REBUILD_WEB=1
    [[ "$p" == packages/shared/* ]] && { REBUILD_API=1; REBUILD_WEB=1; }

    # Infrastructure changes
    [[ "$p" == docker/Dockerfile.api ]] && REBUILD_API=1
    [[ "$p" == docker/Dockerfile.web ]] && REBUILD_WEB=1
    [[ "$p" == docker-compose.yml ]]    && REBUILD_INFRA=1
    [[ "$p" == docker-compose.dev.yml ]]&& REBUILD_INFRA=1
    [[ "$p" == .env ]]                  && REBUILD_INFRA=1
    [[ "$p" == package.json ]]          && REBUILD_INFRA=1
    [[ "$p" == tsconfig.json ]]         && REBUILD_INFRA=1
    [[ "$p" == turbo.json ]]            && REBUILD_INFRA=1
    [[ "$p" == docker/* ]]              && REBUILD_INFRA=1

    return 0
}

detect_important_changes() {
    reset_rebuild_flags

    if ! command_exists git || [ ! -d .git ]; then
        print_warning "Git not available. Enabling full rebuild for safety."
        REBUILD_API=1; REBUILD_WEB=1; REBUILD_INFRA=1
        return
    fi

    while IFS= read -r line; do
        local path="${line:3}"
        classify_path "$path"
    done < <(git status --porcelain --untracked-files=all 2>/dev/null)
}

print_rebuild_plan() {
    if [ "$REBUILD_INFRA" = "1" ]; then
        print_warning "Important infra changes detected: full rebuild required"
        return
    fi
    [ "$REBUILD_API" = "1" ] && print_info "Detected API-relevant changes (packages/api or packages/shared)"
    [ "$REBUILD_WEB" = "1" ] && print_info "Detected Web-relevant changes (packages/web or packages/shared)"
    [ "$REBUILD_API$REBUILD_WEB" = "00" ] && print_info "No critical file changes detected"
}

smart_up() {
    detect_important_changes
    print_rebuild_plan

    if [ "$REBUILD_INFRA" = "1" ]; then
        print_info "Running: $DOCKER_COMPOSE up -d --build"
        $DOCKER_COMPOSE up -d --build
        return $?
    fi

    local services=""
    [ "$REBUILD_API" = "1" ] && services="$services api"
    [ "$REBUILD_WEB" = "1" ] && services="$services web"

    if [ -n "$services" ]; then
        print_info "Running: $DOCKER_COMPOSE up -d --build$services"
        $DOCKER_COMPOSE up -d --build $services
        return $?
    fi

    print_info "Running: $DOCKER_COMPOSE up -d"
    $DOCKER_COMPOSE up -d
}

wait_health() {
    local attempt=0 max_attempts=45

    # API health check
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        local status
        status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")

        if [ "$status" = "200" ]; then
            print_success "API health check passed (healthy)"
            break
        elif [ "$status" = "503" ]; then
            print_warning "API reachable but degraded (/health returned 503)"
            break
        else
            if [ $attempt -lt $max_attempts ]; then
                print_info "Waiting for API health ($attempt/$max_attempts)..."
                sleep 2
            else
                print_warning "API did not become reachable in time"
            fi
        fi
    done

    # Web health check
    local web_status
    web_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
    if [ "$web_status" != "000" ]; then
        print_success "Web health check passed"
    else
        print_warning "Web UI is not responding yet"
    fi

    # Check for TypeScript/Bun runtime errors
    if $DOCKER_COMPOSE logs --since 2m --tail=120 api 2>/dev/null | grep -qiE "TypeError|SyntaxError|ReferenceError|ECONNREFUSED|SQLITE_ERROR"; then
        print_warning "Recent API logs show runtime errors."
        print_warning "Run: ./martin.sh logs api   (to check details)"
        print_warning "Run: ./martin.sh sync       (to rebuild changed services)"
    fi
}

# ============================================
# Docker Commands
# ============================================
start_services() {
    print_header "Start Services"
    check_prerequisites
    detect_docker_compose
    ensure_env

    smart_up || { print_error "Failed to start services"; exit 1; }
    wait_health

    echo ""
    print_success "Martin-Coder is up"
    echo -e "  Web UI:      ${BLUE}http://localhost:3000${NC}"
    echo -e "  API:         ${BLUE}http://localhost:8000${NC}"
    echo -e "  API Health:  ${BLUE}http://localhost:8000/health${NC}"
    echo -e "  OpenAPI:     ${BLUE}http://localhost:8000/openapi.json${NC}"
    echo ""
    read -p "View logs now? (y/N): " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Yy]$ ]] && $DOCKER_COMPOSE logs -f
}

sync_services() {
    print_header "Sync Services (Smart Rebuild)"
    check_prerequisites
    detect_docker_compose

    smart_up || { print_error "Smart sync failed"; exit 1; }
    wait_health
    print_success "Sync completed"
}

stop_services() {
    print_header "Stop Services"
    detect_docker_compose

    echo "1) Stop services (keep data)"
    echo "2) Stop and remove containers + volumes"
    echo "3) Cancel"
    echo ""
    read -p "Select (1-3): " -n 1 -r
    echo ""

    case $REPLY in
        1)
            $DOCKER_COMPOSE down || { print_error "Failed to stop services"; exit 1; }
            print_success "Services stopped; data preserved"
            ;;
        2)
            print_warning "This deletes all persisted data (including SQLite database)"
            read -p "Confirm (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                $DOCKER_COMPOSE down -v || { print_error "Failed to remove services/data"; exit 1; }
                print_success "Containers and data removed"
            else
                print_info "Cancelled"
            fi
            ;;
        *) print_info "Cancelled" ;;
    esac
}

restart_services() {
    print_header "Restart Services"
    check_prerequisites
    detect_docker_compose

    detect_important_changes
    if [ "$REBUILD_INFRA$REBUILD_API$REBUILD_WEB" = "000" ]; then
        print_info "No critical changes detected; using fast restart"
        $DOCKER_COMPOSE restart || { print_error "Restart failed"; exit 1; }
    else
        print_warning "Critical changes detected; running smart rebuild"
        smart_up || { print_error "Restart with rebuild failed"; exit 1; }
    fi

    wait_health
    print_success "Restart flow finished"
}

show_status() {
    print_header "Service Status"
    detect_docker_compose

    $DOCKER_COMPOSE ps
    echo ""
    wait_health

    echo ""
    echo -e "${CYAN}Quick Actions:${NC} [l] logs  [r] restart  [y] sync  [s] stop  [i] info  [q] quit"
    read -p "Choose: " -n 1 -r
    echo ""

    case $REPLY in
        l|L) $DOCKER_COMPOSE logs -f ;;
        r|R) restart_services ;;
        y|Y) sync_services ;;
        s|S) stop_services ;;
        i|I) show_info ;;
        *) ;;
    esac
}

view_logs() {
    detect_docker_compose
    if [ -n "$1" ]; then
        print_info "Logs for service: $1"
        $DOCKER_COMPOSE logs -f "$1"
    else
        print_info "Logs for all services (api, web)"
        $DOCKER_COMPOSE logs -f
    fi
}

build_containers() {
    print_header "Build Containers (Full)"
    check_prerequisites
    detect_docker_compose

    $DOCKER_COMPOSE build || { print_error "Build failed"; exit 1; }
    print_success "Full build completed"
}

clean_all() {
    print_header "Clean Everything"
    detect_docker_compose

    print_warning "This will remove containers, volumes, networks, and local data"
    read -p "Type YES to confirm: " -r
    echo ""

    if [ "$REPLY" = "YES" ]; then
        $DOCKER_COMPOSE down -v || { print_error "Docker clean failed"; exit 1; }

        # Clean local build artifacts
        [ -d node_modules ] && { print_info "Removing node_modules..."; rm -rf node_modules; }
        for pkg in packages/*/; do
            [ -d "${pkg}dist" ] && { print_info "Removing ${pkg}dist..."; rm -rf "${pkg}dist"; }
            [ -d "${pkg}.next" ] && { print_info "Removing ${pkg}.next..."; rm -rf "${pkg}.next"; }
        done

        print_success "Environment cleaned"
    else
        print_info "Cancelled"
    fi
}

access_shell() {
    detect_docker_compose

    if [ -z "$1" ]; then
        echo -e "${CYAN}Usage:${NC} ./martin.sh shell <service>"
        echo ""
        echo -e "${CYAN}Services:${NC}"
        echo -e "  ${GREEN}api${NC}      API server container (Bun shell)"
        echo -e "  ${GREEN}web${NC}      Web frontend container (Node shell)"
        exit 1
    fi

    case $1 in
        api) print_info "Opening shell in API container..."; $DOCKER_COMPOSE exec api sh ;;
        web) print_info "Opening shell in Web container..."; $DOCKER_COMPOSE exec web sh ;;
        *)   print_error "Invalid service: $1 (available: api, web)"; exit 1 ;;
    esac
}

# ============================================
# Development Commands
# ============================================
dev_mode() {
    print_header "Development Mode (Local Bun)"
    check_bun
    ensure_env
    ensure_dependencies

    case "$1" in
        api)
            print_info "Starting API dev server (packages/api)..."
            bun run dev:api
            ;;
        web)
            print_info "Starting Web dev server (packages/web)..."
            bun run dev:web
            ;;
        cli)
            print_info "Starting CLI dev mode (packages/cli)..."
            bun run dev:cli
            ;;
        *)
            print_info "Starting all services in dev mode (turbo)..."
            print_info "API: http://localhost:8000  |  Web: http://localhost:3000"
            bun run dev
            ;;
    esac
}

run_tests() {
    print_header "Run Tests"
    check_bun
    ensure_dependencies

    if [ -n "$1" ]; then
        print_info "Running tests for: $1"
        bun run --cwd "packages/$1" test
    else
        print_info "Running all tests via turbo..."
        bun run test
    fi
    print_success "Tests passed"
}

run_lint() {
    print_header "Run Linter"
    check_bun
    ensure_dependencies

    if [ -n "$1" ]; then
        print_info "Linting package: $1"
        bun run --cwd "packages/$1" lint
    else
        print_info "Linting all packages via turbo..."
        bun run lint
    fi
    print_success "Lint passed"
}

db_manage() {
    print_header "Database Management (SQLite + Drizzle)"

    case "$1" in
        migrate)
            print_info "Running database migrations..."
            bun run --cwd packages/api drizzle-kit push || { print_error "Migration failed"; exit 1; }
            print_success "Migrations applied"
            ;;
        studio)
            print_info "Opening Drizzle Studio (database browser)..."
            bun run --cwd packages/api drizzle-kit studio
            ;;
        generate)
            print_info "Generating migration files..."
            bun run --cwd packages/api drizzle-kit generate || { print_error "Generation failed"; exit 1; }
            print_success "Migration files generated"
            ;;
        reset)
            print_warning "This will DELETE the SQLite database and all data"
            read -p "Type YES to confirm: " -r
            if [ "$REPLY" = "YES" ]; then
                if [ -f data/martin-coder.db ]; then
                    rm -f data/martin-coder.db
                    print_success "Database deleted"
                else
                    print_info "No database file found"
                fi
                print_info "Restart the API to recreate the database"
            else
                print_info "Cancelled"
            fi
            ;;
        *)
            echo -e "${CYAN}Usage:${NC} ./martin.sh db <command>"
            echo ""
            echo -e "${CYAN}Commands:${NC}"
            echo -e "  ${GREEN}migrate${NC}    Push schema changes to database"
            echo -e "  ${GREEN}generate${NC}   Generate migration SQL files"
            echo -e "  ${GREEN}studio${NC}     Open Drizzle Studio (DB browser)"
            echo -e "  ${GREEN}reset${NC}      Delete and recreate database"
            echo ""
            echo -e "${DIM}Database: SQLite at data/martin-coder.db${NC}"
            echo -e "${DIM}ORM: Drizzle ORM with drizzle-kit${NC}"
            ;;
    esac
}

update_project() {
    print_header "Update Project"

    if ! command_exists git; then
        print_error "Git is not installed"
        exit 1
    fi

    print_info "Pulling latest changes..."
    git pull || { print_error "Git pull failed"; exit 1; }

    print_info "Installing dependencies..."
    if command_exists bun; then
        bun install
    else
        print_warning "Bun not found, skipping dependency install"
    fi

    if detect_docker_compose 2>/dev/null; then
        print_info "Rebuilding Docker containers..."
        $DOCKER_COMPOSE build || { print_error "Docker build failed"; exit 1; }

        read -p "Restart services now? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            $DOCKER_COMPOSE up -d
            wait_health
        fi
    fi

    print_success "Update completed"
}

show_info() {
    print_header "Martin-Coder v2.0 - Project Info"
    echo -e "${CYAN}Stack:${NC}"
    echo -e "  Runtime:     ${GREEN}Bun${NC}"
    echo -e "  Language:    ${GREEN}TypeScript 5.7${NC}"
    echo -e "  API:         ${GREEN}Hono 4.6 (port 8000)${NC}"
    echo -e "  Frontend:    ${GREEN}Next.js 14 + React 18 (port 3000)${NC}"
    echo -e "  Database:    ${GREEN}SQLite + Drizzle ORM${NC}"
    echo -e "  AI SDKs:     ${GREEN}Vercel AI SDK (Anthropic, OpenAI, Google, Ollama)${NC}"
    echo -e "  Build:       ${GREEN}Turbo 2.5${NC}"
    echo ""
    echo -e "${CYAN}Packages:${NC}"
    echo -e "  packages/api       ${DIM}- Hono REST API server${NC}"
    echo -e "  packages/web       ${DIM}- Next.js frontend${NC}"
    echo -e "  packages/cli       ${DIM}- CLI tool (martin command)${NC}"
    echo -e "  packages/shared    ${DIM}- Shared types and constants${NC}"
    echo ""
    echo -e "${CYAN}Features:${NC}"
    echo "  - Multi-provider AI chat (Anthropic, OpenAI, Google, Ollama, LM Studio)"
    echo "  - Code editor (Monaco) + Terminal (xterm) + File explorer"
    echo "  - LSP integration (Language Server Protocol)"
    echo "  - MCP integration (Model Context Protocol)"
    echo "  - JWT authentication with role-based access"
    echo "  - Internationalization (English, Spanish)"
    echo "  - Plugin system"
    echo ""
    echo -e "${CYAN}URLs:${NC}"
    echo -e "  Web UI:      ${BLUE}http://localhost:3000${NC}"
    echo -e "  API:         ${BLUE}http://localhost:8000${NC}"
    echo -e "  API Health:  ${BLUE}http://localhost:8000/health${NC}"
    echo -e "  OpenAPI:     ${BLUE}http://localhost:8000/openapi.json${NC}"
}

show_help() {
    print_header "Martin-Coder v2.0 Management Script"
    echo -e "${CYAN}Usage:${NC} ./martin.sh [command]"
    echo ""
    echo -e "${CYAN}Docker Commands:${NC}"
    echo -e "  ${GREEN}start${NC}      Start services with smart rebuild detection"
    echo -e "  ${GREEN}stop${NC}       Stop services (keep or remove data)"
    echo -e "  ${GREEN}restart${NC}    Restart; rebuild changed services if needed"
    echo -e "  ${GREEN}status${NC}     Show container status and health checks"
    echo -e "  ${GREEN}logs${NC}       Tail logs (optionally by service)"
    echo -e "  ${GREEN}build${NC}      Force rebuild all containers"
    echo -e "  ${GREEN}sync${NC}       Smart rebuild changed services and recreate"
    echo -e "  ${GREEN}clean${NC}      Remove containers, volumes, networks"
    echo -e "  ${GREEN}shell${NC}      Open shell in service (api|web)"
    echo ""
    echo -e "${CYAN}Development Commands:${NC}"
    echo -e "  ${GREEN}dev${NC}        Run local dev mode with Bun (no Docker)"
    echo -e "  ${GREEN}test${NC}       Run test suite via turbo"
    echo -e "  ${GREEN}lint${NC}       Run linter via turbo"
    echo -e "  ${GREEN}db${NC}         Database management (migrate|studio|reset)"
    echo -e "  ${GREEN}update${NC}     Pull latest code and rebuild"
    echo -e "  ${GREEN}info${NC}       Show project info and stack details"
    echo -e "  ${GREEN}help${NC}       Show this help"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  ./martin.sh start"
    echo "  ./martin.sh dev"
    echo "  ./martin.sh dev api"
    echo "  ./martin.sh sync"
    echo "  ./martin.sh logs api"
    echo "  ./martin.sh shell api"
    echo "  ./martin.sh db migrate"
    echo "  ./martin.sh test"
    echo ""
    echo -e "${CYAN}Stack:${NC}  Bun + Hono (API) / Next.js (Web) / SQLite (DB)"
    echo ""
    echo -e "Web UI:      ${BLUE}http://localhost:3000${NC}"
    echo -e "API:         ${BLUE}http://localhost:8000${NC}"
    echo -e "API Health:  ${BLUE}http://localhost:8000/health${NC}"
    echo -e "OpenAPI:     ${BLUE}http://localhost:8000/openapi.json${NC}"
}

# ============================================
# Main
# ============================================
main() {
    if [ $# -eq 0 ]; then
        print_banner
        echo -e "${CYAN}Choose an action:${NC}"
        echo ""
        echo "   1) Start services (smart up)"
        echo "   2) Stop services"
        echo "   3) Restart services (smart-aware)"
        echo "   4) Status & health"
        echo "   5) Logs"
        echo "   6) Build all containers"
        echo "   7) Sync (rebuild what changed)"
        echo "   8) Dev mode (local Bun, no Docker)"
        echo "   9) Run tests"
        echo "  10) Run lint"
        echo "  11) Database management"
        echo "  12) Update (pull & rebuild)"
        echo "  13) Project info"
        echo "  14) Shell access"
        echo "  15) Clean all data"
        echo "  16) Help"
        echo "   0) Exit"
        echo ""
        read -p "Select (0-16): " choice

        case $choice in
            1)  start_services ;;
            2)  stop_services ;;
            3)  restart_services ;;
            4)  show_status ;;
            5)  view_logs ;;
            6)  build_containers ;;
            7)  sync_services ;;
            8)  dev_mode ;;
            9)  run_tests ;;
            10) run_lint ;;
            11) db_manage ;;
            12) update_project ;;
            13) show_info ;;
            14) access_shell ;;
            15) clean_all ;;
            16) show_help ;;
            0)  print_info "Goodbye"; exit 0 ;;
            *)  print_error "Invalid option"; exit 1 ;;
        esac
    else
        case "$1" in
            start)      start_services ;;
            stop)       stop_services ;;
            restart)    restart_services ;;
            status)     show_status ;;
            logs)       view_logs "$2" ;;
            build)      build_containers ;;
            sync)       sync_services ;;
            clean)      clean_all ;;
            shell)      access_shell "$2" ;;
            dev)        dev_mode "$2" ;;
            test)       run_tests "$2" ;;
            lint)       run_lint "$2" ;;
            db)         db_manage "$2" ;;
            update)     update_project ;;
            info)       show_info ;;
            help|--help|-h) show_help ;;
            *)          print_error "Unknown command: $1"; echo ""; show_help; exit 1 ;;
        esac
    fi
}

main "$@"
