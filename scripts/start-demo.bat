@echo off
REM ============================================================================
REM Martin-Coder Demo Startup Script for Windows
REM Starts both backend and frontend for demo purposes
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
echo %BLUE%                    MARTIN-CODER DEMO                                   %NC%
echo %BLUE%                                                                        %NC%
echo %BLUE%========================================================================%NC%
echo.

REM Check if demo is set up
if not exist "%ROOT_DIR%\demo_data" (
    echo %YELLOW%Demo not set up. Running setup script...%NC%
    python "%SCRIPT_DIR%setup-demo.py"
    if errorlevel 1 (
        echo %RED%Setup failed!%NC%
        pause
        exit /b 1
    )
)

REM Export demo mode
set DEMO_MODE=true
set DEBUG=true

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

echo %BLUE%Starting backend server...%NC%
cd /d "%ROOT_DIR%\apps\api"

REM Activate virtual environment if exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Start backend in new window
start "Martin-Coder Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo %YELLOW%Waiting for backend to start...%NC%
timeout /t 5 /nobreak >nul

echo %GREEN%Backend started at http://localhost:8000%NC%

echo %BLUE%Starting frontend server...%NC%
cd /d "%ROOT_DIR%\apps\web"

REM Start frontend in new window
start "Martin-Coder Frontend" cmd /k "npm run dev"

echo %YELLOW%Waiting for frontend to start...%NC%
timeout /t 5 /nobreak >nul

echo %GREEN%Frontend started at http://localhost:3000%NC%

echo.
echo %GREEN%========================================================================%NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%                       DEMO READY!                                      %NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%  Web Interface:  http://localhost:3000                                 %NC%
echo %GREEN%  API Docs:       http://localhost:8000/docs                            %NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%  Demo Login:                                                           %NC%
echo %GREEN%    Email:    demo@martin-coder.com                                     %NC%
echo %GREEN%    Password: demo123                                                   %NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%  Close the terminal windows to stop the demo                           %NC%
echo %GREEN%                                                                        %NC%
echo %GREEN%========================================================================%NC%
echo.

REM Open browser
start http://localhost:3000

echo Press any key to open API documentation...
pause >nul
start http://localhost:8000/docs

endlocal
