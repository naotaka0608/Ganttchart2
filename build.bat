@echo off
chcp 65001 > nul
echo ===================================
echo Starting build process for Ganttopia...
echo ===================================

echo [1/2] Checking PyInstaller...
uv pip install pyinstaller

echo [2/2] Building executable (Fast startup mode)...
uv run pyinstaller --noconsole --onedir --add-data "static;static" --name "Ganttopia" --icon "logo.ico" main.py

echo ===================================
echo Build completed! 
echo Check the "dist" folder for Ganttopia.exe.
echo ===================================
pause
