import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface ChangelogEntry {
  version: string;
  notes: string;
}

export async function checkForUpdates(): Promise<ChangelogEntry | null> {
  try {
    const update = await check();
    if (update?.available) {
      return {
        version: update.version,
        notes: update.body || "Bug fixes and improvements",
      };
    }
    return null;
  } catch {
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
