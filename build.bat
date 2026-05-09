@echo off
chcp 65001 > nul
echo ===================================
echo Starting build process for Ganttopia...
echo ===================================

echo [1/3] Cleaning up old artifacts...
if exist build rd /s /q build
if exist dist\Ganttopia.exe del /f /q dist\Ganttopia.exe

echo [2/3] Checking PyInstaller...
uv pip install pyinstaller

echo [3/3] Building executable (Fast startup mode)...
uv run pyinstaller --noconsole --onedir --add-data "static;static" --name "Ganttopia" --icon "logo.ico" -y main.py

echo ===================================
echo Build completed! 
echo.
echo NOTE: The executable is located in:
echo   dist\Ganttopia\Ganttopia.exe
echo.
echo (Do NOT use the old dist\Ganttopia.exe if it was there)
echo ===================================
pause
