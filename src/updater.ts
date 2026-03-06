import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface ChangelogEntry {
  version: string;
  notes: string;
}

export async function checkForUpdates(): Promise<ChangelogEntry | null> {
  try {
    console.log("Checking for updates...");
    const update = await check();
    console.log("Update check result:", update);
    if (update?.available) {
      console.log("Update available:", update.version);
      return {
        version: update.version,
        notes: update.body || "Bug fixes and improvements",
      };
    }
    console.log("No update available");
    return null;
  } catch (err) {
    console.error("Update check error:", err);
    return null;
  }
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