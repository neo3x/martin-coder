@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================
:: Martin-Coder v2.0 - Management Script for Windows
:: TypeScript/Bun Stack | Smart Rebuild + Health Guardrails
:: ============================================

:: -------- ANSI setup --------
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
if not defined ESC set "ESC="

set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "MAGENTA=%ESC%[95m"
set "CYAN=%ESC%[96m"
set "WHITE=%ESC%[97m"
set "DIM=%ESC%[90m"
set "BOLD=%ESC%[1m"
set "NC=%ESC%[0m"

title Martin-Coder v2.0 Manager (Bun + TypeScript)

set "DOCKER_COMPOSE="
set "REBUILD_API=0"
set "REBUILD_WEB=0"
set "REBUILD_INFRA=0"

:: -------- Command routing --------
if "%~1"=="" goto :menu
if /i "%~1"=="start" goto :start_services
if /i "%~1"=="stop" goto :stop_services
if /i "%~1"=="restart" goto :restart_services
if /i "%~1"=="status" goto :show_status
if /i "%~1"=="logs" goto :view_logs
if /i "%~1"=="build" goto :build_containers
if /i "%~1"=="sync" goto :sync_services
if /i "%~1"=="clean" goto :clean_all
if /i "%~1"=="shell" goto :access_shell
if /i "%~1"=="dev" goto :dev_mode
if /i "%~1"=="test" goto :run_tests
if /i "%~1"=="lint" goto :run_lint
if /i "%~1"=="db" goto :db_manage
if /i "%~1"=="update" goto :update_project
if /i "%~1"=="info" goto :show_info
if /i "%~1"=="help" goto :show_help
if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
goto :unknown_command

:: ============================================
:: UI Helpers
:: ============================================
:banner
cls
echo %CYAN%%BOLD%============================================================%NC%
echo %CYAN%%BOLD%             Martin-Coder v2.0 Manager                      %NC%
echo %CYAN%%BOLD%          TypeScript / Bun / Hono / Next.js                 %NC%
echo %CYAN%%BOLD%============================================================%NC%
echo.
goto :eof

:print_header
echo.
echo %BLUE%%BOLD%------------------------------------------------------------%NC%
echo %BLUE%%BOLD% %~1%NC%
echo %BLUE%%BOLD%------------------------------------------------------------%NC%
echo.
goto :eof

:print_success
echo %GREEN%[OK]%NC% %~1
goto :eof

:print_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARN]%NC% %~1
goto :eof

:print_error
echo %RED%[ERR ]%NC% %~1
goto :eof

:pause_if_menu
if "%~1"=="menu" (
  echo.
  pause
)
goto :eof

:: ============================================
:: Prerequisites
:: ============================================
:check_prerequisites
where docker >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not installed."
    echo Visit: https://docs.docker.com/get-docker/
    exit /b 1
)
where curl >nul 2>&1
if %errorlevel% neq 0 (
    call :print_warning "curl not found. Health checks will be limited."
)
exit /b 0

:detect_docker_compose
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    set "DOCKER_COMPOSE=docker compose"
    exit /b 0
)

where docker-compose >nul 2>&1
if %errorlevel% equ 0 (
    set "DOCKER_COMPOSE=docker-compose"
    exit /b 0
)

call :print_error "Docker Compose is not installed."
echo Visit: https://docs.docker.com/compose/install/
exit /b 1

:check_bun
where bun >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Bun is not installed (required for local dev)."
    echo Visit: https://bun.sh/docs/installation
    exit /b 1
)
exit /b 0

:ensure_env
if exist .env (
    call :print_success ".env file already exists"
    exit /b 0
)

call :print_info "Creating .env from .env.example..."
if not exist .env.example (
    call :print_error ".env.example not found"
    exit /b 1
)

copy .env.example .env >nul
if %errorlevel% neq 0 (
    call :print_error "Failed to create .env"
    exit /b 1
)
call :print_success ".env created"
call :print_warning "Review .env values before production use"
call :print_warning "At minimum, set SECRET_KEY and your AI provider API keys"
exit /b 0

:ensure_dependencies
:: Check if node_modules exist at root (bun install)
if exist node_modules exit /b 0
if not exist package.json exit /b 0

call :print_info "Installing dependencies with bun..."
bun install >nul 2>&1
if %errorlevel% neq 0 (
    call :print_warning "Could not install dependencies automatically"
    exit /b 0
)
call :print_success "Dependencies installed"
exit /b 0

:: ============================================
:: Smart Rebuild Detection
:: ============================================
:reset_rebuild_flags
set "REBUILD_API=0"
set "REBUILD_WEB=0"
set "REBUILD_INFRA=0"
exit /b 0

:classify_path
set "P=%~1"
if "%P%"=="" exit /b 0

:: Core package changes (new monorepo structure)
if /i "%P:~0,13%"=="packages/api/" set "REBUILD_API=1"
if /i "%P:~0,13%"=="packages/web/" set "REBUILD_WEB=1"
if /i "%P:~0,16%"=="packages/shared/" set "REBUILD_API=1" & set "REBUILD_WEB=1"

:: Dockerfile / compose / env changes
if /i "%P%"=="docker/Dockerfile.api" set "REBUILD_API=1"
if /i "%P%"=="docker/Dockerfile.web" set "REBUILD_WEB=1"
if /i "%P%"=="docker-compose.yml" set "REBUILD_INFRA=1"
if /i "%P%"=="docker-compose.dev.yml" set "REBUILD_INFRA=1"
if /i "%P%"==".env" set "REBUILD_INFRA=1"
if /i "%P%"=="package.json" set "REBUILD_INFRA=1"
if /i "%P%"=="tsconfig.json" set "REBUILD_INFRA=1"
if /i "%P%"=="turbo.json" set "REBUILD_INFRA=1"
if /i "%P:~0,7%"=="docker/" set "REBUILD_INFRA=1"

exit /b 0

:detect_important_changes
call :reset_rebuild_flags

where git >nul 2>&1
if %errorlevel% neq 0 (
    call :print_warning "Git not found. Enabling full rebuild for safety."
    set "REBUILD_API=1"
    set "REBUILD_WEB=1"
    set "REBUILD_INFRA=1"
    exit /b 0
)

if not exist .git (
    call :print_warning "No .git folder. Enabling full rebuild for safety."
    set "REBUILD_API=1"
    set "REBUILD_WEB=1"
    set "REBUILD_INFRA=1"
    exit /b 0
)

for /f "delims=" %%f in ('git status --porcelain --untracked-files=all 2^>nul') do (
    set "LINE=%%f"
    set "PATH_CAND=!LINE:~3!"
    call :classify_path "!PATH_CAND!"
)

exit /b 0

:print_rebuild_plan
if "%REBUILD_INFRA%"=="1" (
    call :print_warning "Important infra changes detected: full rebuild required"
    exit /b 0
)

if "%REBUILD_API%"=="1" call :print_info "Detected API-relevant changes (packages/api or packages/shared)"
if "%REBUILD_WEB%"=="1" call :print_info "Detected Web-relevant changes (packages/web or packages/shared)"
if "%REBUILD_API%%REBUILD_WEB%"=="00" call :print_info "No critical file changes detected"
exit /b 0

:smart_up
call :detect_important_changes
call :print_rebuild_plan

if "%REBUILD_INFRA%"=="1" (
    call :print_info "Running: %DOCKER_COMPOSE% up -d --build"
    %DOCKER_COMPOSE% up -d --build
    exit /b %errorlevel%
)

set "SERVICES="
if "%REBUILD_API%"=="1" set "SERVICES=!SERVICES! api"
if "%REBUILD_WEB%"=="1" set "SERVICES=!SERVICES! web"

if defined SERVICES (
    call :print_info "Running: !DOCKER_COMPOSE! up -d --build!SERVICES!"
    !DOCKER_COMPOSE! up -d --build !SERVICES!
    exit /b !errorlevel!
)

call :print_info "Running: %DOCKER_COMPOSE% up -d"
%DOCKER_COMPOSE% up -d
exit /b %errorlevel%

:wait_health
set /a ATTEMPT=0
set /a MAX_ATTEMPTS=45

:health_loop
set /a ATTEMPT+=1
set "API_STATUS="
for /f %%s in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri ''http://localhost:8000/health'' -UseBasicParsing -TimeoutSec 3).StatusCode } catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 } }"') do set "API_STATUS=%%s"

if "!API_STATUS!"=="200" (
    call :print_success "API health check passed (healthy)"
) else if "!API_STATUS!"=="503" (
    call :print_warning "API reachable but degraded (/health returned 503)"
) else (
    if !ATTEMPT! lss !MAX_ATTEMPTS! (
        timeout /t 2 /nobreak >nul
        goto :health_loop
    )
    call :print_warning "API did not become reachable in time"
)

set "WEB_STATUS="
for /f %%s in ('powershell -NoProfile -Command "try { (Invoke-WebRequest -Uri ''http://localhost:3000'' -UseBasicParsing -TimeoutSec 3).StatusCode } catch { if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 } }"') do set "WEB_STATUS=%%s"

if not "!WEB_STATUS!"=="0" (
    call :print_success "Web health check passed"
) else (
    call :print_warning "Web UI is not responding yet"
)

:: Guard against common error patterns in TypeScript/Bun API logs
%DOCKER_COMPOSE% logs --since 2m --tail=120 api | findstr /i "TypeError SyntaxError ReferenceError ECONNREFUSED SQLITE_ERROR" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_warning "Recent API logs show runtime errors."
    call :print_warning "Run: martin.bat logs api   (to check details)"
    call :print_warning "Run: martin.bat sync       (to rebuild changed services)"
)

exit /b 0

:: ============================================
:: Commands
:: ============================================
:menu
call :banner
echo %WHITE%Choose an action:%NC%
echo.
echo   %CYAN% 1%NC%^) Start services ^(smart up^)
echo   %CYAN% 2%NC%^) Stop services
echo   %CYAN% 3%NC%^) Restart services ^(smart-aware^)
echo   %CYAN% 4%NC%^) Status ^& health
echo   %CYAN% 5%NC%^) Logs
echo   %CYAN% 6%NC%^) Build all containers
echo   %CYAN% 7%NC%^) Sync ^(rebuild what changed^)
echo   %CYAN% 8%NC%^) Dev mode ^(local Bun, no Docker^)
echo   %CYAN% 9%NC%^) Run tests
echo   %CYAN%10%NC%^) Run lint
echo   %CYAN%11%NC%^) Database management
echo   %CYAN%12%NC%^) Update ^(pull ^& rebuild^)
echo   %CYAN%13%NC%^) Project info
echo   %CYAN%14%NC%^) Shell access
echo   %CYAN%15%NC%^) Clean all data
echo   %CYAN%16%NC%^) Help
echo   %CYAN% 0%NC%^) Exit
echo.
set /p "choice=Select (0-16): "

if "%choice%"=="1" goto :start_services
if "%choice%"=="2" goto :stop_services
if "%choice%"=="3" goto :restart_services
if "%choice%"=="4" goto :show_status
if "%choice%"=="5" goto :view_logs
if "%choice%"=="6" goto :build_containers
if "%choice%"=="7" goto :sync_services
if "%choice%"=="8" goto :dev_mode
if "%choice%"=="9" goto :run_tests
if "%choice%"=="10" goto :run_lint
if "%choice%"=="11" goto :db_manage
if "%choice%"=="12" goto :update_project
if "%choice%"=="13" goto :show_info
if "%choice%"=="14" goto :access_shell
if "%choice%"=="15" goto :clean_all
if "%choice%"=="16" goto :show_help
if "%choice%"=="0" goto :exit_script
call :print_error "Invalid option"
call :pause_if_menu menu
goto :menu

:show_help
call :print_header "Martin-Coder v2.0 Management Script"
echo %CYAN%Usage:%NC% martin.bat [command]
echo.
echo %CYAN%Docker Commands:%NC%
echo   %GREEN%start%NC%      Start services with smart rebuild detection
echo   %GREEN%stop%NC%       Stop services ^(keep or remove data^)
echo   %GREEN%restart%NC%    Restart; rebuild changed services if needed
echo   %GREEN%status%NC%     Show container status and health checks
echo   %GREEN%logs%NC%       Tail logs ^(optionally by service^)
echo   %GREEN%build%NC%      Force rebuild all containers
echo   %GREEN%sync%NC%       Smart rebuild changed services and recreate
echo   %GREEN%clean%NC%      Remove containers, volumes, networks
echo   %GREEN%shell%NC%      Open shell in service ^(api^|web^)
echo.
echo %CYAN%Development Commands:%NC%
echo   %GREEN%dev%NC%        Run local dev mode with Bun ^(no Docker^)
echo   %GREEN%test%NC%       Run test suite via turbo
echo   %GREEN%lint%NC%       Run linter via turbo
echo   %GREEN%db%NC%         Database management ^(migrate^|studio^|reset^)
echo   %GREEN%update%NC%     Pull latest code and rebuild
echo   %GREEN%info%NC%       Show project info and stack details
echo   %GREEN%help%NC%       Show this help

echo.
echo %CYAN%Examples:%NC%
echo   martin.bat start
echo   martin.bat dev
echo   martin.bat dev api
echo   martin.bat sync
echo   martin.bat logs api
echo   martin.bat shell api
echo   martin.bat db migrate
echo   martin.bat test

echo.
echo %CYAN%Stack:%NC%  Bun + Hono ^(API^) / Next.js ^(Web^) / SQLite ^(DB^)
echo.
echo Web UI:      %BLUE%http://localhost:3000%NC%
echo API:         %BLUE%http://localhost:8000%NC%
echo API Health:  %BLUE%http://localhost:8000/health%NC%
echo OpenAPI:     %BLUE%http://localhost:8000/openapi.json%NC%
goto :eof

:show_info
call :print_header "Martin-Coder v2.0 - Project Info"
echo %CYAN%Stack:%NC%
echo   Runtime:     %GREEN%Bun%NC%
echo   Language:    %GREEN%TypeScript 5.7%NC%
echo   API:         %GREEN%Hono 4.6 (port 8000)%NC%
echo   Frontend:    %GREEN%Next.js 14 + React 18 (port 3000)%NC%
echo   Database:    %GREEN%SQLite + Drizzle ORM%NC%
echo   AI SDKs:     %GREEN%Vercel AI SDK (Anthropic, OpenAI, Google, Ollama)%NC%
echo   Build:       %GREEN%Turbo 2.5%NC%
echo.
echo %CYAN%Packages:%NC%
echo   packages/api       %DIM%- Hono REST API server%NC%
echo   packages/web       %DIM%- Next.js frontend%NC%
echo   packages/cli       %DIM%- CLI tool (martin command)%NC%
echo   packages/shared    %DIM%- Shared types and constants%NC%
echo.
echo %CYAN%Features:%NC%
echo   - Multi-provider AI chat (Anthropic, OpenAI, Google, Ollama, LM Studio)
echo   - Code editor (Monaco) + Terminal (xterm) + File explorer
echo   - LSP integration (Language Server Protocol)
echo   - MCP integration (Model Context Protocol)
echo   - JWT authentication with role-based access
echo   - Internationalization (English, Spanish)
echo   - Plugin system
echo.
echo %CYAN%URLs:%NC%
echo   Web UI:      %BLUE%http://localhost:3000%NC%
echo   API:         %BLUE%http://localhost:8000%NC%
echo   API Health:  %BLUE%http://localhost:8000/health%NC%
echo   OpenAPI:     %BLUE%http://localhost:8000/openapi.json%NC%
goto :eof

:start_services
call :print_header "Start Services"
call :check_prerequisites || exit /b 1
call :detect_docker_compose || exit /b 1
call :ensure_env || exit /b 1

call :smart_up
if %errorlevel% neq 0 (
    call :print_error "Failed to start services"
    exit /b 1
)

call :wait_health

echo.
call :print_success "Martin-Coder is up"
echo   Web UI:      %BLUE%http://localhost:3000%NC%
echo   API:         %BLUE%http://localhost:8000%NC%
echo   API Health:  %BLUE%http://localhost:8000/health%NC%
echo   OpenAPI:     %BLUE%http://localhost:8000/openapi.json%NC%
echo.
set /p "view_logs=View logs now? (y/N): "
if /i "%view_logs%"=="y" %DOCKER_COMPOSE% logs -f
goto :eof

:sync_services
call :print_header "Sync Services (Smart Rebuild)"
call :check_prerequisites || exit /b 1
call :detect_docker_compose || exit /b 1

call :smart_up
if %errorlevel% neq 0 (
    call :print_error "Smart sync failed"
    exit /b 1
)
call :wait_health
call :print_success "Sync completed"
goto :eof

:stop_services
call :print_header "Stop Services"
call :detect_docker_compose || exit /b 1

echo %YELLOW%1)%NC% Stop services ^(keep data^)
echo %YELLOW%2)%NC% Stop and remove containers + volumes
echo %YELLOW%3)%NC% Cancel
echo.
set /p "stop_choice=Select (1-3): "

if "%stop_choice%"=="1" (
    %DOCKER_COMPOSE% down
    if %errorlevel% neq 0 (
        call :print_error "Failed to stop services"
        exit /b 1
    )
    call :print_success "Services stopped; data preserved"
    goto :eof
)

if "%stop_choice%"=="2" (
    call :print_warning "This deletes all persisted data (including SQLite database)"
    set /p "confirm=Confirm (y/N): "
    if /i not "%confirm%"=="y" (
        call :print_info "Cancelled"
        goto :eof
    )
    %DOCKER_COMPOSE% down -v
    if %errorlevel% neq 0 (
        call :print_error "Failed to remove services/data"
        exit /b 1
    )
    call :print_success "Containers and data removed"
    goto :eof
)

call :print_info "Cancelled"
goto :eof

:restart_services
call :print_header "Restart Services"
call :check_prerequisites || exit /b 1
call :detect_docker_compose || exit /b 1

call :detect_important_changes
if "%REBUILD_INFRA%%REBUILD_API%%REBUILD_WEB%"=="000" (
    call :print_info "No critical changes detected; using fast restart"
    %DOCKER_COMPOSE% restart
    if %errorlevel% neq 0 (
        call :print_error "Restart failed"
        exit /b 1
    )
) else (
    call :print_warning "Critical changes detected; running smart rebuild instead of plain restart"
    call :smart_up
    if %errorlevel% neq 0 (
        call :print_error "Restart with smart rebuild failed"
        exit /b 1
    )
)

call :wait_health
call :print_success "Restart flow finished"
goto :eof

:show_status
call :print_header "Service Status"
call :detect_docker_compose || exit /b 1

%DOCKER_COMPOSE% ps
echo.
call :wait_health

echo.
echo %CYAN%Quick Actions:%NC% [l] logs   [r] restart   [y] sync   [s] stop   [i] info   [q] quit
set /p "action=Choose: "
if /i "%action%"=="l" %DOCKER_COMPOSE% logs -f
if /i "%action%"=="r" goto :restart_services
if /i "%action%"=="y" goto :sync_services
if /i "%action%"=="s" goto :stop_services
if /i "%action%"=="i" goto :show_info
goto :eof

:view_logs
call :detect_docker_compose || exit /b 1
if not "%~2"=="" (
    call :print_info "Logs for service: %~2"
    %DOCKER_COMPOSE% logs -f %~2
) else (
    call :print_info "Logs for all services (api, web)"
    %DOCKER_COMPOSE% logs -f
)
goto :eof

:build_containers
call :print_header "Build Containers (Full)"
call :check_prerequisites || exit /b 1
call :detect_docker_compose || exit /b 1

%DOCKER_COMPOSE% build
if %errorlevel% neq 0 (
    call :print_error "Build failed"
    exit /b 1
)
call :print_success "Full build completed"
goto :eof

:clean_all
call :print_header "Clean Everything"
call :detect_docker_compose || exit /b 1

call :print_warning "This will remove containers, volumes, networks, and local data"
set /p "confirm=Type YES to confirm: "
if /i not "%confirm%"=="YES" (
    call :print_info "Cancelled"
    goto :eof
)

%DOCKER_COMPOSE% down -v
if %errorlevel% neq 0 (
    call :print_error "Docker clean failed"
    exit /b 1
)

:: Also clean local build artifacts
if exist node_modules (
    call :print_info "Removing node_modules..."
    rmdir /s /q node_modules >nul 2>&1
)
for /d %%d in (packages\*) do (
    if exist "%%d\dist" (
        call :print_info "Removing %%d\dist..."
        rmdir /s /q "%%d\dist" >nul 2>&1
    )
    if exist "%%d\.next" (
        call :print_info "Removing %%d\.next..."
        rmdir /s /q "%%d\.next" >nul 2>&1
    )
)

call :print_success "Environment cleaned"
goto :eof

:: ============================================
:: Development Commands (Local Bun, no Docker)
:: ============================================
:dev_mode
call :print_header "Development Mode (Local Bun)"
call :check_bun || exit /b 1
call :ensure_env || exit /b 1
call :ensure_dependencies

if /i "%~2"=="api" (
    call :print_info "Starting API dev server (packages/api)..."
    bun run dev:api
    goto :eof
)
if /i "%~2"=="web" (
    call :print_info "Starting Web dev server (packages/web)..."
    bun run dev:web
    goto :eof
)
if /i "%~2"=="cli" (
    call :print_info "Starting CLI dev mode (packages/cli)..."
    bun run dev:cli
    goto :eof
)

call :print_info "Starting all services in dev mode (turbo)..."
call :print_info "API: http://localhost:8000  |  Web: http://localhost:3000"
bun run dev
goto :eof

:run_tests
call :print_header "Run Tests"
call :check_bun || exit /b 1
call :ensure_dependencies

if not "%~2"=="" (
    call :print_info "Running tests for: %~2"
    bun run --cwd packages\%~2 test
) else (
    call :print_info "Running all tests via turbo..."
    bun run test
)

if %errorlevel% neq 0 (
    call :print_error "Tests failed"
    exit /b 1
)
call :print_success "Tests passed"
goto :eof

:run_lint
call :print_header "Run Linter"
call :check_bun || exit /b 1
call :ensure_dependencies

if not "%~2"=="" (
    call :print_info "Linting package: %~2"
    bun run --cwd packages\%~2 lint
) else (
    call :print_info "Linting all packages via turbo..."
    bun run lint
)

if %errorlevel% neq 0 (
    call :print_error "Lint errors found"
    exit /b 1
)
call :print_success "Lint passed"
goto :eof

:db_manage
call :print_header "Database Management (SQLite + Drizzle)"

if /i "%~2"=="migrate" (
    call :print_info "Running database migrations..."
    bun run --cwd packages\api drizzle-kit push
    if %errorlevel% neq 0 (
        call :print_error "Migration failed"
        exit /b 1
    )
    call :print_success "Migrations applied"
    goto :eof
)

if /i "%~2"=="studio" (
    call :print_info "Opening Drizzle Studio (database browser)..."
    bun run --cwd packages\api drizzle-kit studio
    goto :eof
)

if /i "%~2"=="generate" (
    call :print_info "Generating migration files..."
    bun run --cwd packages\api drizzle-kit generate
    if %errorlevel% neq 0 (
        call :print_error "Generation failed"
        exit /b 1
    )
    call :print_success "Migration files generated"
    goto :eof
)

if /i "%~2"=="reset" (
    call :print_warning "This will DELETE the SQLite database and all data"
    set /p "confirm=Type YES to confirm: "
    if /i not "!confirm!"=="YES" (
        call :print_info "Cancelled"
        goto :eof
    )
    if exist data\martin-coder.db (
        del /f data\martin-coder.db >nul 2>&1
        call :print_success "Database deleted"
    ) else (
        call :print_info "No database file found"
    )
    call :print_info "Restart the API to recreate the database"
    goto :eof
)

echo %CYAN%Usage:%NC% martin.bat db ^<command^>
echo.
echo %CYAN%Commands:%NC%
echo   %GREEN%migrate%NC%    Push schema changes to database
echo   %GREEN%generate%NC%   Generate migration SQL files
echo   %GREEN%studio%NC%     Open Drizzle Studio (DB browser)
echo   %GREEN%reset%NC%      Delete and recreate database
echo.
echo %DIM%Database: SQLite at data/martin-coder.db%NC%
echo %DIM%ORM: Drizzle ORM with drizzle-kit%NC%
goto :eof

:update_project
call :print_header "Update Project"

where git >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Git is not installed"
    exit /b 1
)

call :print_info "Pulling latest changes..."
git pull
if %errorlevel% neq 0 (
    call :print_error "Git pull failed"
    exit /b 1
)

call :print_info "Installing dependencies..."
where bun >nul 2>&1
if %errorlevel% equ 0 (
    bun install
) else (
    call :print_warning "Bun not found, skipping dependency install"
)

call :detect_docker_compose || exit /b 1
if !errorlevel! equ 0 (
    call :print_info "Rebuilding Docker containers..."
    !DOCKER_COMPOSE! build
    if !errorlevel! neq 0 (
        call :print_error "Docker build failed"
        exit /b 1
    )

    set /p "restart_now=Restart services now? (y/N): "
    if /i "!restart_now!"=="y" (
        !DOCKER_COMPOSE! up -d
        call :wait_health
    )
)

call :print_success "Update completed"
goto :eof

:: ============================================
:: Shell Access
:: ============================================
:access_shell
call :detect_docker_compose || exit /b 1
if "%~2"=="" (
    echo %CYAN%Usage:%NC% martin.bat shell ^<service^>
    echo.
    echo %CYAN%Services:%NC%
    echo   %GREEN%api%NC%      API server container (Bun shell)
    echo   %GREEN%web%NC%      Web frontend container (Node shell)
    exit /b 1
)

if /i "%~2"=="api" (
    call :print_info "Opening shell in API container..."
    %DOCKER_COMPOSE% exec api sh
    goto :eof
)
if /i "%~2"=="web" (
    call :print_info "Opening shell in Web container..."
    %DOCKER_COMPOSE% exec web sh
    goto :eof
)

call :print_error "Invalid service: %~2 (available: api, web)"
exit /b 1

:unknown_command
call :print_error "Unknown command: %~1"
echo.
call :show_help
exit /b 1

:exit_script
call :print_info "Goodbye"
exit /b 0
