@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ============================================
:: Martin-Coder - Management Script for Windows
:: Smart rebuild + better UX
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

title Martin-Coder Manager (Smart Rebuild)

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
echo %CYAN%%BOLD%                 Martin-Coder Manager                        %NC%
echo %CYAN%%BOLD%            Smart Rebuild + Health Guardrails                %NC%
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
exit /b 0

:ensure_web_lockfile
if exist apps\web\package-lock.json exit /b 0
if not exist apps\web\package.json exit /b 0

call :print_info "Generating apps\\web\\package-lock.json ..."
pushd apps\web
call npm install --package-lock-only >nul 2>&1
set "NPM_RC=%errorlevel%"
popd
if not "%NPM_RC%"=="0" (
    call :print_warning "Could not generate package-lock.json automatically"
    exit /b 0
)
call :print_success "package-lock.json generated"
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

:: Core app changes
if /i "%P:~0,9%"=="apps/api/" set "REBUILD_API=1"
if /i "%P:~0,9%"=="apps/web/" set "REBUILD_WEB=1"

:: Dockerfile / compose / env changes
if /i "%P%"=="docker/api.Dockerfile" set "REBUILD_API=1"
if /i "%P%"=="docker/web.Dockerfile" set "REBUILD_WEB=1"
if /i "%P%"=="docker-compose.yml" set "REBUILD_INFRA=1"
if /i "%P%"=="docker-compose.dev.yml" set "REBUILD_INFRA=1"
if /i "%P%"==".env" set "REBUILD_INFRA=1"
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

if "%REBUILD_API%"=="1" call :print_info "Detected API-relevant changes"
if "%REBUILD_WEB%"=="1" call :print_info "Detected Web-relevant changes"
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
    call :print_info "Running: %DOCKER_COMPOSE% up -d --build!SERVICES!"
    %DOCKER_COMPOSE% up -d --build !SERVICES!
    exit /b %errorlevel%
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
        call :print_info "Waiting for API health (!ATTEMPT!/!MAX_ATTEMPTS!)..."
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

:: Guard against previous recurring issue signature (recent logs only)
%DOCKER_COMPOSE% logs --since 2m --tail=120 api | findstr /i "ValidationError MessageResponse Input should be a valid dictionary" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_warning "Recent API logs still show validation errors."
    call :print_warning "Run: martin.bat sync  (forces smart rebuild of changed services)"
)

exit /b 0

:: ============================================
:: Commands
:: ============================================
:menu
call :banner
echo %WHITE%Choose an action:%NC%
echo.
echo   %CYAN%1%NC%^) Start services ^(smart up^)
echo   %CYAN%2%NC%^) Stop services
echo   %CYAN%3%NC%^) Restart services ^(smart-aware^)
echo   %CYAN%4%NC%^) Status ^& health
echo   %CYAN%5%NC%^) Logs
echo   %CYAN%6%NC%^) Build all containers
echo   %CYAN%7%NC%^) Sync ^(rebuild what changed and recreate^)
echo   %CYAN%8%NC%^) Clean all data
echo   %CYAN%9%NC%^) Help
echo   %CYAN%0%NC%^) Exit
echo.
set /p "choice=Select (0-9): "

if "%choice%"=="1" goto :start_services
if "%choice%"=="2" goto :stop_services
if "%choice%"=="3" goto :restart_services
if "%choice%"=="4" goto :show_status
if "%choice%"=="5" goto :view_logs
if "%choice%"=="6" goto :build_containers
if "%choice%"=="7" goto :sync_services
if "%choice%"=="8" goto :clean_all
if "%choice%"=="9" goto :show_help
if "%choice%"=="0" goto :exit_script
call :print_error "Invalid option"
call :pause_if_menu menu
goto :menu

:show_help
call :print_header "Martin-Coder Management Script"
echo %CYAN%Usage:%NC% martin.bat [command]
echo.
echo %CYAN%Commands:%NC%
echo   %GREEN%start%NC%    Start services with smart rebuild detection
echo   %GREEN%stop%NC%     Stop services ^(keep or remove data^)
echo   %GREEN%restart%NC%  Restart; rebuild changed services if needed
echo   %GREEN%status%NC%   Show container status and health checks
echo   %GREEN%logs%NC%     Tail logs ^(optionally by service^)
echo   %GREEN%build%NC%    Force rebuild all containers
echo   %GREEN%sync%NC%     Smart rebuild changed services and recreate
echo   %GREEN%clean%NC%    Remove containers, volumes, networks
echo   %GREEN%shell%NC%    Open shell in service ^(api^|web^|postgres^|redis^)
echo   %GREEN%help%NC%     Show help

echo.
echo %CYAN%Examples:%NC%
echo   martin.bat start
echo   martin.bat sync
echo   martin.bat logs api
echo   martin.bat shell api

echo.
echo Web UI:   %BLUE%http://localhost:3000%NC%
echo API:      %BLUE%http://localhost:8000%NC%
echo API Docs: %BLUE%http://localhost:8000/docs%NC%
goto :eof

:start_services
call :print_header "Start Services"
call :check_prerequisites || exit /b 1
call :detect_docker_compose || exit /b 1
call :ensure_env || exit /b 1
call :ensure_web_lockfile

call :smart_up
if %errorlevel% neq 0 (
    call :print_error "Failed to start services"
    exit /b 1
)

call :wait_health

echo.
call :print_success "Martin-Coder is up"
echo   Web UI:   %BLUE%http://localhost:3000%NC%
echo   API:      %BLUE%http://localhost:8000%NC%
echo   API Docs: %BLUE%http://localhost:8000/docs%NC%
echo.
set /p "view_logs=View logs now? (y/N): "
if /i "%view_logs%"=="y" %DOCKER_COMPOSE% logs -f
goto :eof

:sync_services
call :print_header "Sync Services (Smart Rebuild)"
call :check_prerequisites || exit /b 1
call :detect_docker_compose || exit /b 1
call :ensure_web_lockfile

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
    call :print_warning "This deletes all persisted data"
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
echo %CYAN%Quick Actions:%NC% [l] logs   [r] restart   [y] sync   [s] stop   [q] quit
set /p "action=Choose: "
if /i "%action%"=="l" %DOCKER_COMPOSE% logs -f
if /i "%action%"=="r" goto :restart_services
if /i "%action%"=="y" goto :sync_services
if /i "%action%"=="s" goto :stop_services
goto :eof

:view_logs
call :detect_docker_compose || exit /b 1
if not "%~2"=="" (
    call :print_info "Logs for service: %~2"
    %DOCKER_COMPOSE% logs -f %~2
) else (
    call :print_info "Logs for all services"
    %DOCKER_COMPOSE% logs -f
)
goto :eof

:build_containers
call :print_header "Build Containers (Full)"
call :check_prerequisites || exit /b 1
call :detect_docker_compose || exit /b 1
call :ensure_web_lockfile

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

call :print_warning "This will remove containers, volumes, and networks"
set /p "confirm=Type YES to confirm: "
if /i not "%confirm%"=="YES" (
    call :print_info "Cancelled"
    goto :eof
)

%DOCKER_COMPOSE% down -v
if %errorlevel% neq 0 (
    call :print_error "Clean failed"
    exit /b 1
)
call :print_success "Environment cleaned"
goto :eof

:access_shell
call :detect_docker_compose || exit /b 1
if "%~2"=="" (
    call :print_error "Usage: martin.bat shell <api|web|postgres|redis>"
    exit /b 1
)

if /i "%~2"=="api" (
    %DOCKER_COMPOSE% exec api bash
    goto :eof
)
if /i "%~2"=="web" (
    %DOCKER_COMPOSE% exec web sh
    goto :eof
)
if /i "%~2"=="postgres" (
    %DOCKER_COMPOSE% exec postgres psql -U martin -d martin_coder
    goto :eof
)
if /i "%~2"=="redis" (
    %DOCKER_COMPOSE% exec redis redis-cli
    goto :eof
)

call :print_error "Invalid service: %~2"
exit /b 1

:unknown_command
call :print_error "Unknown command: %~1"
echo.
call :show_help
exit /b 1

:exit_script
call :print_info "Goodbye"
exit /b 0
