@echo off
REM ============================================================================
REM Martin-Coder Installation Script for Windows
REM Installs all dependencies and sets up the environment
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
echo %BLUE%              MARTIN-CODER INSTALLATION                                 %NC%
echo %BLUE%========================================================================%NC%
echo.

REM Check Python version
echo %BLUE%[1/5] Checking Python...%NC%
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%  Python not found!%NC%
    echo %YELLOW%  Please install Python 3.11+ from https://python.org%NC%
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version') do set PYVER=%%i
for /f "tokens=1,2 delims=." %%a in ("%PYVER%") do (
    set PYMAJOR=%%a
    set PYMINOR=%%b
)

if %PYMAJOR% LSS 3 (
    echo %RED%  Python 3.11+ required. Found: %PYVER%%NC%
    pause
    exit /b 1
)
if %PYMAJOR%==3 if %PYMINOR% LSS 11 (
    echo %RED%  Python 3.11+ required. Found: %PYVER%%NC%
    pause
    exit /b 1
)
echo %GREEN%  Python %PYVER% - OK%NC%

REM Check Node.js version
echo %BLUE%[2/5] Checking Node.js...%NC%
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%  Node.js not found!%NC%
    echo %YELLOW%  Please install Node.js 20+ from https://nodejs.org%NC%
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%i in ('node --version') do set NODEVER=%%i
for /f "tokens=1 delims=." %%a in ("%NODEVER%") do set NODEMAJOR=%%a

if %NODEMAJOR% LSS 20 (
    echo %RED%  Node.js 20+ required. Found: v%NODEVER%%NC%
    pause
    exit /b 1
)
echo %GREEN%  Node.js v%NODEVER% - OK%NC%

REM Create Python virtual environment
echo %BLUE%[3/5] Setting up Python environment...%NC%
cd /d "%ROOT_DIR%\apps\api"

if not exist "venv" (
    echo %YELLOW%  Creating virtual environment...%NC%
    python -m venv venv
)

call venv\Scripts\activate.bat
echo %YELLOW%  Installing Python dependencies...%NC%
pip install -r requirements.txt -q
echo %GREEN%  Python environment ready%NC%

REM Install Node.js dependencies
echo %BLUE%[4/5] Installing Node.js dependencies...%NC%
cd /d "%ROOT_DIR%\apps\web"
echo %YELLOW%  Running npm install...%NC%
call npm install --silent
echo %GREEN%  Node.js dependencies installed%NC%

REM Setup environment file
echo %BLUE%[5/5] Setting up configuration...%NC%
cd /d "%ROOT_DIR%"

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo %GREEN%  Created .env from template%NC%
        echo %YELLOW%  Please edit .env with your API keys%NC%
    )
) else (
    echo %GREEN%  .env file already exists%NC%
)

REM Create data directories
if not exist "data" mkdir data

echo.
echo %GREEN%========================================================================%NC%
echo %GREEN%              INSTALLATION COMPLETE!                                    %NC%
echo %GREEN%========================================================================%NC%
echo.
echo %GREEN%  Next steps:%NC%
echo.
echo %BLUE%  1. Edit .env with your configuration:%NC%
echo     notepad .env
echo.
echo %BLUE%  2. Start the application:%NC%
echo     scripts\start.bat
echo.
echo %BLUE%  Or run the demo:%NC%
echo     scripts\start-demo.bat
echo.
pause

endlocal
