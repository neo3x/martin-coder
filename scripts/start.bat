@echo off
REM ============================================================================
REM Martin-Coder Production Startup Script for Windows
REM Starts both backend and frontend for production use
REM ============================================================================

setlocal EnableDelayedExpansion

REM Colors (Windows 10+)
set "GREEN=[92m"
set "BLUE=[94m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

echo.
echo %BLUE%========================================================================%NC%
echo %BLUE%                                                                        %NC%
echo %BLUE%     __  __    _    ____ _____ ___ _   _        ____ ___  ____  _____ ____  %NC%
echo %BLUE%    |  \/  |  / \  |  _ \_   _|_ _| \ | |      / ___/ _ \|  _ \| ____|  _ \ %NC%
echo %BLUE%    | |\/| | / _ \ | |_) || |  | ||  \| |_____| |  | | | | | | |  _| | |_) |%NC%
echo %BLUE%    | |  | |/ ___ \|  _ < | |  | || |\  |_____| |__| |_| | |_| | |___|  _ < %NC%
echo %BLUE%    |_|  |_/_/   \_\_| \_\|_| |___|_| \_|      \____\___/|____/|_____|_| \_\%NC%
echo %BLUE%                                                                        %NC%
echo %BLUE%========================================================================%NC%
echo.

REM Check if .env exists
if not exist "%ROOT_DIR%\.env" (
    if exist "%ROOT_DIR%\.env.example" (
        echo %YELLOW%Creating .env from .env.example...%NC%
        copy "%ROOT_DIR%\.env.example" "%ROOT_DIR%\.env" >nul
        echo %YELLOW%Please edit .env with your configuration before continuing.%NC%
        notepad "%ROOT_DIR%\.env"
        pause
    ) else (
        echo %RED%.env file not found! Please create one from .env.example%NC%
        pause
        exit /b 1
    )
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Python not found! Please install Python 3.11+%NC%
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Node.js not found! Please install Node.js 20+%NC%
    pause
    exit /b 1
)

REM Parse command line arguments
set "MODE=dev"
if "%1"=="--prod" set "MODE=prod"
if "%1"=="-p" set "MODE=prod"

echo %BLUE%Starting in %MODE% mode...%NC%
echo.

REM Start backend
echo %BLUE%[1/2] Starting backend server...%NC%
cd /d "%ROOT_DIR%\apps\api"

REM Activate virtual environment if exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

if "%MODE%"=="prod" (
    REM Production mode - no reload
    start "Martin-Coder Backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4"
) else (
    REM Development mode - with reload
    start "Martin-Coder Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

echo %YELLOW%Waiting for backend to start...%NC%
timeout /t 5 /nobreak >nul

echo %GREEN%  Backend started at http://localhost:8000%NC%

REM Start frontend
echo %BLUE%[2/2] Starting frontend server...%NC%
cd /d "%ROOT_DIR%\apps\web"

if "%MODE%"=="prod" (
    REM Production mode - build and serve
    echo %YELLOW%Building frontend for production...%NC%
    call npm run build
    start "Martin-Coder Frontend" cmd /k "npm run start"
) else (
    REM Development mode
    start "Martin-Coder Frontend" cmd /k "npm run dev"
)

echo %YELLOW%Waiting for frontend to start...%NC%
timeout /t 5 /nobreak >nul

echo %GREEN%  Frontend started at http://localhost:3005%NC%

echo.
echo %GREEN%========================================================================%NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%                    MARTIN-CODER RUNNING                                %NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%  Mode:           %MODE%                                                %NC%
echo %GREEN%  Web Interface:  http://localhost:3005                                 %NC%
echo %GREEN%  API:            http://localhost:8000                                 %NC%
echo %GREEN%  API Docs:       http://localhost:8000/docs                            %NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%  Close the terminal windows to stop the application                    %NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%========================================================================%NC%
echo.

REM Open browser
choice /c YN /m "Open browser now"
if errorlevel 2 goto :skip_browser
start http://localhost:3005
:skip_browser

echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul

endlocal
