@echo off
:: ============================================================
::  MORPHIC - Windows Dependency Installer
::  Run this script as Administrator to install all dependencies
:: ============================================================

echo.
echo  ===========================================================
echo   MORPHIC - Dependency Installer for Windows
echo  ===========================================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] This script requires Administrator privileges.
    echo     Right-click and select "Run as Administrator"
    pause
    exit /b 1
)

:: Check for winget
where winget >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Windows Package Manager (winget) not found.
    echo     Please install it from the Microsoft Store or update Windows.
    pause
    exit /b 1
)

echo [1/6] Installing Node.js...
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -h

echo.
echo [2/6] Installing LibreOffice (for document conversion)...
winget install TheDocumentFoundation.LibreOffice --accept-source-agreements --accept-package-agreements -h

echo.
echo [3/6] Installing FFmpeg (for video/audio processing)...
winget install Gyan.FFmpeg --accept-source-agreements --accept-package-agreements -h

echo.
echo [4/6] Installing Tesseract OCR (for text recognition)...
winget install UB-Mannheim.TesseractOCR --accept-source-agreements --accept-package-agreements -h

echo.
echo [5/6] Installing QPDF (for PDF repair/encryption)...
winget install QPDF.QPDF --accept-source-agreements --accept-package-agreements -h

echo.
echo [6/6] Installing Ghostscript (for PDF compression)...
winget install ArtifexSoftware.GhostScript --accept-source-agreements --accept-package-agreements -h

echo.
echo  ===========================================================
echo   Installation Complete!
echo  ===========================================================
echo.
echo  Next steps:
echo    1. Restart your terminal/computer to refresh PATH
echo    2. Run in development mode:
echo       cd morphic
echo       npm run install:all
echo       npm run dev
echo.
pause
