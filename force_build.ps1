# Force build with elevated permissions
# Run this script as Administrator

Write-Host "Setting up build environment..."

# Clear cargo cache
Remove-Item -Path "$env:USERPROFILE\.cargo\registry\cache" -Recurse -Force -ErrorAction SilentlyContinue

# Set environment variables
$env:CARGO_TARGET_DIR = "C:\Users\Tripp\Desktop\Aura\src-tauri\target"
$env:RUSTC_WRAPPER = ""

# Try building with verbose output
Write-Host "Starting build..."
Set-Location "C:\Users\Tripp\Desktop\Aura"
npm run tauri build -- --verbose
