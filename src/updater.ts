import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface ChangelogEntry {
  version: string;
  notes: string;
}

export async function checkForUpdates(): Promise<ChangelogEntry | null> {
  try {
    console.log("🔍 Checking for updates...");
    
    // Fetch latest.json directly to bypass Tauri's version comparison
    const response = await fetch('https://github.com/Trippledesigns/Aura/releases/latest/download/latest.json');
    const latestData = await response.json();
    
    console.log("📦 Latest version from server:", latestData.version);
    
    // Get current app version
    const currentVersion = '0.2.4'; // This should match the installed app version
    console.log("📱 Current app version:", currentVersion);
    
    // Custom version comparison
    if (isNewerVersion(latestData.version, currentVersion)) {
      console.log("✅ Update available:", latestData.version);
      console.log("📝 Release notes:", latestData.notes);
      
      return {
        version: latestData.version,
        notes: latestData.notes || "Bug fixes and improvements",
      };
    }
    
    console.log("ℹ️ No update available");
    return null;
    
  } catch (error) {
    console.error("❌ Update check failed:", error);
    return null;
  }
}

// Custom version comparison function
function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latestPart = latestParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  
  return false;
}

export async function installUpdate(): Promise<void> {
  try {
    const update = await check();
    if (update?.available) {
      await update.downloadAndInstall();
      await relaunch();
    }
  } catch (err) {
    console.error("Update failed:", err);
  }
}