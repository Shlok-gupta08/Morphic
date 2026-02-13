# Create-Shortcut.ps1
# Creates a desktop shortcut for Morphic with the correct icon

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Morphic.lnk"

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetPath = Join-Path $ScriptDir "Morphic.bat"
$IconPath = Join-Path $ScriptDir "icon.ico"

# Check if icon.ico exists, if not try to create it
if (-not (Test-Path $IconPath)) {
    $PngPath = Join-Path $ScriptDir "icon.png"
    if (Test-Path $PngPath) {
        try {
            & magick $PngPath -define icon:auto-resize=256,128,64,48,32,16 $IconPath 2>$null
        } catch {
            Write-Host "Could not create icon.ico - ImageMagick may not be installed" -ForegroundColor Yellow
        }
    }
}

# Create the shortcut
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.Description = "Morphic - Local File Converter"

# Set icon if it exists
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = "$IconPath,0"
    Write-Host "Using icon: $IconPath" -ForegroundColor Green
} else {
    Write-Host "Icon not found, using default" -ForegroundColor Yellow
}

$Shortcut.Save()

Write-Host ""
Write-Host "Desktop shortcut created/updated: $ShortcutPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
