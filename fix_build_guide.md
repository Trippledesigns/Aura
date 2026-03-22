# Fix for Windows Application Control Build Issue

## Problem:
Windows Application Control (WDAC) is blocking Rust build scripts with error:
"An Application Control policy has blocked this file. (os error 4551)"

## Solutions:

### Option 1: Run as Administrator (Recommended)
1. Right-click PowerShell
2. "Run as Administrator"
3. Navigate to project: `cd C:\Users\Tripp\Desktop\Aura`
4. Run: `npm run tauri build`

### Option 2: Use GitHub Actions (Automatic)
1. Push your changes to GitHub
2. Create a tag: `git tag v0.3.3`
3. Push the tag: `git push origin v0.3.3`
4. GitHub Actions will automatically build and create the release

### Option 3: Temporary Windows Defender Exclusion
1. Open Windows Security
2. Go to "Virus & threat protection"
3. Click "Manage settings" under "Virus & threat protection settings"
4. Add "C:\Users\Tripp\Desktop\Aura\src-tauri\target" to exclusions
5. Restart PowerShell and try building again

### Option 4: Disable Application Control (Temporary)
1. Open Group Policy Editor (gpedit.msc)
2. Navigate to: Computer Configuration > Windows Settings > Security Settings > Application Control Policies
3. Temporarily disable policies
4. Reboot and try building
5. Remember to re-enable after building

## Why this happened:
The Rust build system generates temporary executable files during compilation, which Windows Application Control sees as suspicious and blocks them.

## Recommendation:
Use Option 1 (Run as Administrator) or Option 2 (GitHub Actions) for the most reliable results.
