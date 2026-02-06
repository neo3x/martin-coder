@echo off
setlocal enabledelayedexpansion

:: ============================================
:: Martin-Coder - Management Script for Windows
:: ============================================
:: Unified script for managing Martin-Coder Docker services
:: Usage: martin.bat [start|stop|restart|status|logs|build|help]

title Martin-Coder Manager

:: Colors using ANSI escape codes (Windows 10+)
set "ESC="
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "MAGENTA=%ESC%[95m"
set "CYAN=%ESC%[96m"
set "NC=%ESC%[0m"

:: Enable ANSI colors
for /f "tokens=3" %%a in ('reg query HKCU\Console /v VirtualTerminalLevel 2^>nul') do set "VT=%%a"
if not defined VT (
    reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
)

:: Check command
if "%1"=="" goto :menu
if /i "%1"=="start" goto :start_services
if /i "%1"=="stop" goto :stop_services
if /i "%1"=="restart" goto :restart_services
if /i "%1"=="status" goto :show_status
if /i "%1"=="logs" goto :view_logs
if /i "%1"=="build" goto :build_containers
if /i "%1"=="clean" goto :clean_all
if /i "%1"=="shell" goto :access_shell
if /i "%1"=="help" goto :show_help
if /i "%1"=="--help" goto :show_help
if /i "%1"=="-h" goto :show_help
goto :unknown_command

:: ============================================
:: Menu
:: ============================================
:menu
cls
echo %BLUE%============================================%NC%
echo %BLUE%  Martin-Coder Management%NC%
echo %BLUE%============================================%NC%
echo.
echo %CYAN%Select an action:%NC%
echo.
echo   1) Start services
echo   2) Stop services
echo   3) Restart services
echo   4) Show status
echo   5) View logs
echo   6) Build containers
echo   7) Clean all data
echo   8) Help
echo   9) Exit
echo.
set /p "choice=Enter your choice (1-9): "

if "%choice%"=="1" goto :start_services
if "%choice%"=="2" goto :stop_services
if "%choice%"=="3" goto :restart_services
if "%choice%"=="4" goto :show_status
if "%choice%"=="5" goto :view_logs
if "%choice%"=="6" goto :build_containers
if "%choice%"=="7" goto :clean_all
if "%choice%"=="8" goto :show_help
if "%choice%"=="9" goto :exit_script
echo.
echo %RED%[X]%NC% Invalid option
goto :menu

:: ============================================
:: Print Functions
:: ============================================
:print_header
echo.
echo %BLUE%============================================%NC%
echo %BLUE%  %~1%NC%
echo %BLUE%============================================%NC%
echo.
goto :eof

:print_success
echo %GREEN%[OK]%NC% %~1
goto :eof

:print_info
echo %BLUE%[i]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[!]%NC% %~1
goto :eof

:print_error
echo %RED%[X]%NC% %~1
goto :eof

:: ============================================
:: Check Prerequisites
:: ============================================
:check_prerequisites
where docker >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not installed. Please install Docker first."
    echo Visit: https://docs.docker.com/get-docker/
    exit /b 1
)
goto :eof

:detect_docker_compose
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    set "DOCKER_COMPOSE=docker compose"
) else (
    where docker-compose >nul 2>&1
    if %errorlevel% equ 0 (
        set "DOCKER_COMPOSE=docker-compose"
    ) else (
        call :print_error "Docker Compose is not installed"
        echo Visit: https://docs.docker.com/compose/install/
        exit /b 1
    )
)
goto :eof

:: ============================================
:: Help
:: ============================================
:show_help
call :print_header "Martin-Coder Management Script"
echo %CYAN%Usage:%NC%
echo   martin.bat [command]
echo.
echo %CYAN%Commands:%NC%
echo   %GREEN%start%NC%      Start all services (builds if needed, creates .env)
echo   %GREEN%stop%NC%       Stop all services (interactive - preserve or remove data)
echo   %GREEN%restart%NC%    Restart all services
echo   %GREEN%status%NC%     Show status and health of all services
echo   %GREEN%logs%NC%       View logs (add service name to filter: logs api)
echo   %GREEN%build%NC%      Rebuild all containers
echo   %GREEN%clean%NC%      Stop and remove all containers and data
echo   %GREEN%shell%NC%      Access container shell (usage: shell api^|web^|postgres^|redis)
echo   %GREEN%help%NC%       Show this help message
echo.
echo %CYAN%Examples:%NC%
echo   martin.bat start           # Start all services
echo   martin.bat status          # Check service status
echo   martin.bat logs api        # View API logs
echo   martin.bat shell api       # Access API container
echo   martin.bat restart         # Restart all services
echo.
echo %CYAN%Quick URLs:%NC%
echo   Web UI:      %BLUE%http://localhost:3000%NC%
echo   API:         %BLUE%http://localhost:8000%NC%
echo   API Docs:    %BLUE%http://localhost:8000/docs%NC%
echo.
goto :eof

:: ============================================
:: Start Services
:: ============================================
:start_services
call :print_header "Martin-Coder - Starting Services"

call :check_prerequisites
if %errorlevel% neq 0 exit /b 1

call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

call :print_info "Checking prerequisites..."

for /f "tokens=3" %%v in ('docker --version') do set "DOCKER_VER=%%v"
call :print_success "Docker found: %DOCKER_VER%"

docker compose version --short >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%v in ('docker compose version --short') do set "COMPOSE_VER=%%v"
    call :print_success "Docker Compose found: !COMPOSE_VER!"
)
echo.

:: Check if .env exists
if not exist .env (
    call :print_info "Creating .env file from .env.example..."
    if exist .env.example (
        copy .env.example .env >nul
        call :print_success ".env file created"
        call :print_warning "Please edit .env file with your API keys before running in production"
        echo.
        set /p "edit_env=Do you want to edit .env file now? (y/N): "
        if /i "!edit_env!"=="y" (
            notepad .env
        )
    ) else (
        call :print_error ".env.example not found"
        exit /b 1
    )
) else (
    call :print_success ".env file already exists"
)
echo.

:: Stop existing containers
call :print_info "Stopping existing containers (if any)..."
%DOCKER_COMPOSE% down >nul 2>&1
call :print_success "Stopped existing containers"
echo.

:: Check and generate package-lock.json if needed
if not exist apps\web\package-lock.json (
    call :print_info "Generating package-lock.json for web application..."
    if exist apps\web\package.json (
        pushd apps\web
        call npm install --package-lock-only >nul 2>&1
        popd
        call :print_success "package-lock.json generated"
    )
)

:: Build containers
call :print_info "Building Docker containers (this may take a few minutes)..."
%DOCKER_COMPOSE% build
if %errorlevel% neq 0 (
    call :print_error "Failed to build Docker containers"
    exit /b 1
)
call :print_success "Docker containers built successfully"
echo.

:: Start containers
call :print_info "Starting all services..."
%DOCKER_COMPOSE% up -d
if %errorlevel% neq 0 (
    call :print_error "Failed to start services"
    exit /b 1
)
call :print_success "All services started successfully"
echo.

:: Wait for services
call :print_info "Waiting for services to be ready..."
timeout /t 5 /nobreak >nul

:: Show status
call :print_info "Checking service status..."
%DOCKER_COMPOSE% ps
echo.

echo %GREEN%============================================%NC%
echo %GREEN%  Martin-Coder is running!%NC%
echo %GREEN%============================================%NC%
echo.
echo Web UI:      %BLUE%http://localhost:3000%NC%
echo API:         %BLUE%http://localhost:8000%NC%
echo API Docs:    %BLUE%http://localhost:8000/docs%NC%
echo.
echo Useful commands:
echo   View logs:       %YELLOW%martin.bat logs%NC%
echo   Check status:    %YELLOW%martin.bat status%NC%
echo   Stop services:   %YELLOW%martin.bat stop%NC%
echo   Restart:         %YELLOW%martin.bat restart%NC%
echo.

set /p "view_logs=Do you want to view logs now? (y/N): "
if /i "%view_logs%"=="y" (
    %DOCKER_COMPOSE% logs -f
)
goto :eof

:: ============================================
:: Stop Services
:: ============================================
:stop_services
call :print_header "Martin-Coder - Stop Services"

call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

echo %YELLOW%What would you like to do?%NC%
echo 1) Stop services (keep data)
echo 2) Stop and remove containers, volumes and data
echo 3) Cancel
echo.
set /p "stop_choice=Select an option (1-3): "
echo.

if "%stop_choice%"=="1" (
    call :print_info "Stopping all services..."
    %DOCKER_COMPOSE% down
    if %errorlevel% equ 0 (
        call :print_success "All services stopped successfully"
        call :print_info "Data volumes preserved"
    ) else (
        call :print_error "Failed to stop services"
        exit /b 1
    )
) else if "%stop_choice%"=="2" (
    call :print_warning "This will delete all data including databases!"
    set /p "confirm=Are you sure? (y/N): "
    if /i "!confirm!"=="y" (
        call :print_info "Stopping and removing all services and data..."
        %DOCKER_COMPOSE% down -v
        if %errorlevel% equ 0 (
            call :print_success "All services and data removed successfully"
        ) else (
            call :print_error "Failed to remove services"
            exit /b 1
        )
    ) else (
        call :print_info "Operation cancelled"
    )
) else if "%stop_choice%"=="3" (
    call :print_info "Operation cancelled"
) else (
    call :print_error "Invalid option"
    exit /b 1
)
echo.
call :print_success "Done!"
goto :eof

:: ============================================
:: Restart Services
:: ============================================
:restart_services
call :print_header "Martin-Coder - Restart Services"

call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

call :print_info "Restarting all services..."
%DOCKER_COMPOSE% restart
if %errorlevel% equ 0 (
    call :print_success "All services restarted successfully"
    echo.
    %DOCKER_COMPOSE% ps
) else (
    call :print_error "Failed to restart services"
    exit /b 1
)
goto :eof

:: ============================================
:: Show Status
:: ============================================
:show_status
call :print_header "Martin-Coder - Service Status"

call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

call :print_info "Container Status:"
echo.
%DOCKER_COMPOSE% ps
echo.

call :print_info "Service URLs:"
echo.
echo   Web UI:      %BLUE%http://localhost:3000%NC%
echo   API:         %BLUE%http://localhost:8000%NC%
echo   API Docs:    %BLUE%http://localhost:8000/docs%NC%
echo   PostgreSQL:  %BLUE%localhost:5432%NC%
echo   Redis:       %BLUE%localhost:6379%NC%
echo.

call :print_info "Health Checks:"
curl -s -f http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "API is responding"
) else (
    call :print_warning "API is not responding"
)

curl -s -f http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "Web UI is responding"
) else (
    call :print_warning "Web UI is not responding"
)
echo.

echo %YELLOW%Quick Actions:%NC%
echo   [l] View logs    [r] Restart    [s] Stop    [q] Quit
echo.
set /p "action=Select option: "

if /i "%action%"=="l" (
    echo.
    %DOCKER_COMPOSE% logs -f
) else if /i "%action%"=="r" (
    goto :restart_services
) else if /i "%action%"=="s" (
    goto :stop_services
) else if /i "%action%"=="q" (
    call :print_info "Goodbye!"
)
goto :eof

:: ============================================
:: View Logs
:: ============================================
:view_logs
call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

if not "%2"=="" (
    call :print_info "Viewing logs for: %2"
    %DOCKER_COMPOSE% logs -f %2
) else (
    call :print_info "Viewing all logs (Ctrl+C to exit)"
    %DOCKER_COMPOSE% logs -f
)
goto :eof

:: ============================================
:: Build Containers
:: ============================================
:build_containers
call :print_header "Martin-Coder - Build Containers"

call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

:: Check and generate package-lock.json if needed
if not exist apps\web\package-lock.json (
    call :print_info "Generating package-lock.json for web application..."
    if exist apps\web\package.json (
        pushd apps\web
        call npm install --package-lock-only >nul 2>&1
        popd
        call :print_success "package-lock.json generated"
    )
    echo.
)

call :print_info "Building all containers..."
%DOCKER_COMPOSE% build
if %errorlevel% equ 0 (
    call :print_success "All containers built successfully"
) else (
    call :print_error "Failed to build containers"
    exit /b 1
)
goto :eof

:: ============================================
:: Clean All
:: ============================================
:clean_all
call :print_header "Martin-Coder - Clean All"

call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

call :print_warning "This will:"
echo   - Stop all containers
echo   - Remove all containers
echo   - Remove all volumes (databases, cache, etc.)
echo   - Remove all networks
echo.
set /p "confirm=Are you absolutely sure? (type 'yes' to confirm): "
echo.

if /i "%confirm%"=="yes" (
    call :print_info "Cleaning everything..."
    %DOCKER_COMPOSE% down -v
    call :print_success "All containers, volumes, and networks removed"
) else (
    call :print_info "Operation cancelled"
)
goto :eof

:: ============================================
:: Access Shell
:: ============================================
:access_shell
call :detect_docker_compose
if %errorlevel% neq 0 exit /b 1

if "%2"=="" (
    call :print_error "Please specify a service: api, web, postgres, or redis"
    echo Usage: martin.bat shell ^<service^>
    exit /b 1
)

if /i "%2"=="api" (
    call :print_info "Accessing API container shell..."
    %DOCKER_COMPOSE% exec api bash
) else if /i "%2"=="web" (
    call :print_info "Accessing Web container shell..."
    %DOCKER_COMPOSE% exec web sh
) else if /i "%2"=="postgres" (
    call :print_info "Accessing PostgreSQL..."
    %DOCKER_COMPOSE% exec postgres psql -U martin -d martin_coder
) else if /i "%2"=="redis" (
    call :print_info "Accessing Redis CLI..."
    %DOCKER_COMPOSE% exec redis redis-cli
) else (
    call :print_error "Invalid service: %2"
    echo Available services: api, web, postgres, redis
    exit /b 1
)
goto :eof

:: ============================================
:: Unknown Command
:: ============================================
:unknown_command
call :print_error "Unknown command: %1"
echo.
call :show_help
exit /b 1

:: ============================================
:: Exit
:: ============================================
:exit_script
call :print_info "Goodbye!"
exit /b 0
