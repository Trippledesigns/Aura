# Release Instructions for Aura v0.3.3

## Steps to Create Release:

1. **Go to GitHub Releases Page:**
   - Navigate to: https://github.com/Trippledesigns/Aura/releases

2. **Create New Release:**
   - Click "Create a new release"
   - Tag: `v0.3.3`
   - Title: `Aura v0.3.3`
   - Description:
   ```
   🐛 Bug Fix Release v0.3.3

🔧 Critical Fixes
- Fixed missing closing brace in App.tsx that caused syntax errors
- Resolved compilation issues preventing app startup
- Improved overall application stability

📦 This is a mandatory update to fix the syntax error that was preventing the application from running properly.
   ```

3. **Upload Assets:**
   - Since the Tauri build failed due to system policies, you'll need to:
     - Either build on a different machine
     - Or use GitHub Actions to build automatically
     - Or temporarily disable the Application Control policy

4. **Update latest.json:**
   - The latest.json file has been updated to point to v0.3.3
   - Make sure to upload the built executable and update the signature

## Auto-Update Test:
Once the release is created with the executable, the auto-updater should detect v0.3.3 and prompt users to update from their current version.

## Files Changed:
- package.json: bumped to v0.3.3
- src-tauri/tauri.conf.json: bumped to v0.3.3  
- latest.json: updated with new version info
- src/App.tsx: fixed missing closing brace
