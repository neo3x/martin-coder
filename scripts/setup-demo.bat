@echo off
REM ============================================================================
REM Martin-Coder Demo Setup Script for Windows
REM Wrapper for the Python setup script
REM ============================================================================

setlocal

set "SCRIPT_DIR=%~dp0"

echo.
echo ========================================================================
echo                    MARTIN-CODER DEMO SETUP
echo ========================================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [91mPython not found! Please install Python 3.11+[0m
    echo Download from: https://python.org
    pause
    exit /b 1
)

REM Run the Python setup script
python "%SCRIPT_DIR%setup-demo.py"

if errorlevel 1 (
    echo.
    echo [91mSetup failed![0m
    pause
    exit /b 1
)

echo.
echo [92mSetup complete! Run start-demo.bat to start the demo.[0m
echo.
pause

endlocal
