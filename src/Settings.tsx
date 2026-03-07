import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Game } from "./GameCard";
import { Folder, Trash2, Check, RefreshCw, MessageSquare } from "lucide-react";
import { checkForUpdates, installUpdate } from "./updater";
import Feedback from "./Feedback";

const THEMES = [
  { id: "midnight", name: "Midnight", emoji: "🌑", bg: "#0a0a14", accent: "#a78bfa" },
  { id: "ember", name: "Ember", emoji: "🔥", bg: "#0f0a06", accent: "#fb923c" },
  { id: "arctic", name: "Arctic", emoji: "🌊", bg: "#060d14", accent: "#38bdf8" },
  { id: "sakura", name: "Sakura", emoji: "🌸", bg: "#0f080d", accent: "#f472b6" },
  { id: "nebula", name: "Nebula", emoji: "💜", bg: "#08060f", accent: "#c084fc" },
];

interface SettingsProps {
  activeTheme: string;
  onThemeChange: (theme: string) => void;
  localFolders: string[];
  onAddFolder: (games: Game[]) => void;
  onRemoveFolder: (folder: string) => void;
  onRescan: () => Promise<void>;
}

function Settings({ activeTheme, onThemeChange, localFolders, onAddFolder, onRemoveFolder, onRescan }: SettingsProps) {
  // Update state management
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "latest">("idle");
  const [updateVersion, setUpdateVersion] = useState<string>("");
  const [updateNotes, setUpdateNotes] = useState<string>("");
  const [rescanning, setRescanning] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleRescan = async () => {
    setRescanning(true);
    await onRescan();
    setTimeout(() => setRescanning(false), 1500);
  };

  const handleCheckUpdates = async () => {
    setUpdateStatus("checking");
    const update = await checkForUpdates();
    if (update) {
      setUpdateStatus("available");
      setUpdateVersion(update.version);
      setUpdateNotes(update.notes);
    } else {
      setUpdateStatus("latest");
    }
  };

  const handleInstallUpdate = async () => {
    await installUpdate();
  };

  const handleAddFolder = async () => {
    const folder = await open({
      directory: true,
      multiple: false,
      title: "Select Games Folder",
    });

    if (folder) {
      try {
        const raw = await invoke<any[]>("scan_local_folder", {
          folderPath: folder,
        });
        const mapped: Game[] = raw.map((g) => ({
          id: g.id,
          title: g.name,
          genre: "Unknown",
          platform: "Local",
          playtime: 0,
          hltb: 0,
          lastPlayed: null,
          cover: g.cover,
          launchCommand: g.launch_command,
        }));
        onAddFolder(mapped);
      } catch (err) {
        console.error("Local scan error:", err);
      }
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="settings-subtitle">Customise your Aura experience</p>
      </div>

      {/* Theme Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Theme</h2>
          <p className="settings-section-desc">Choose your launcher's personality</p>
        </div>
        <div className="theme-grid">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              className={`theme-card ${activeTheme === theme.id ? "active" : ""}`}
              onClick={() => onThemeChange(theme.id)}
            >
              {/* Mini UI Preview */}
              <div
                className="theme-preview"
                style={{ background: theme.bg, borderColor: activeTheme === theme.id ? theme.accent : "rgba(255,255,255,0.08)" }}
              >
                {/* Fake sidebar */}
                <div className="theme-preview-sidebar" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="theme-preview-nav"
                      style={{ background: i === 1 ? theme.accent + "33" : "rgba(255,255,255,0.05)" }}
                    />
                  ))}
                </div>
                {/* Fake content */}
                <div className="theme-preview-content">
                  <div className="theme-preview-cards">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="theme-preview-card"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: i === 1 ? theme.accent + "66" : "rgba(255,255,255,0.06)" }}
                      />
                    ))}
                  </div>
                </div>
                {/* Active checkmark */}
                {activeTheme === theme.id && (
                  <div className="theme-preview-check" style={{ background: theme.accent }}>
                    <Check size={10} color="white" />
                  </div>
                )}
              </div>
              <div className="theme-card-footer">
                <span className="theme-card-emoji">{theme.emoji}</span>
                <span className="theme-card-name">{theme.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Local Folders Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Local Game Folders</h2>
          <p className="settings-section-desc">Aura will scan these folders for games automatically</p>
        </div>
        <button className="add-folder-btn" onClick={handleAddFolder}>
          <Folder size={14} />
          Add Folder
        </button>
        {localFolders.length === 0 ? (
          <p className="no-folders">No folders added yet</p>
        ) : (
          <div className="folder-list">
            {localFolders.map((folder) => (
              <div key={folder} className="folder-item">
                <Folder size={14} color="var(--accent)" />
                <span>{folder}</span>
                <button className="folder-remove" onClick={() => onRemoveFolder(folder)}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Library Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Library</h2>
          <p className="settings-section-desc">Manage your game library</p>
        </div>
        <div className="rescan-row">
          <div>
            <p className="rescan-title">Rescan Library</p>
            <p className="rescan-desc">Manually refresh all platforms if a game is missing or was recently uninstalled</p>
          </div>
          <button
            className={`rescan-btn ${rescanning ? "scanning" : ""}`}
            onClick={handleRescan}
            disabled={rescanning}
          >
            <RefreshCw size={14} className={rescanning ? "spinning-icon" : ""} />
            {rescanning ? "Scanning..." : "Rescan"}
          </button>
        </div>
      </div>

      {/* Update Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Updates</h2>
        </div>
        <div className="update-section">
          <div className="update-info">
            <p className="update-version-label">Current Version</p>
            <p className="update-version">v0.3.1</p>
          </div>

          {updateStatus === "idle" && (
            <button className="check-update-btn" onClick={handleCheckUpdates}>
              <Check size={14} />
              Check for Updates
            </button>
          )}

          {updateStatus === "checking" && (
            <button className="check-update-btn" disabled>
              <Check size={14} />
              Checking...
            </button>
          )}

          {updateStatus === "latest" && (
            <div className="update-result">
              <p className="update-latest">✅ You're on the latest version!</p>
              <button className="check-update-btn" onClick={handleCheckUpdates}>
                <Check size={14} />
                Check Again
              </button>
            </div>
          )}

          {updateStatus === "available" && (
            <div className="update-result">
              <p className="update-available">🎉 v{updateVersion} is available!</p>
              <div className="update-notes">
                {updateNotes.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="update-note-line">{line}</p>
                ))}
              </div>
              <button className="check-update-btn accent" onClick={handleInstallUpdate}>
                Install Update
              </button>
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">About</h2>
        </div>
        <div className="about-card">
          <div className="about-logo">
            <span className="about-name">Aura</span>
            <span className="about-version">v0.3.1</span>
          </div>
          <p className="about-tagline">"400 games. 6 launchers. Playing the same 3."</p>
          <p className="about-desc">Built by a gamer who was just really annoyed. 😄</p>
          <button className="check-update-btn" onClick={() => setFeedbackOpen(true)}>
            <MessageSquare size={14} />
            Send Feedback
          </button>
        </div>
      </div>
      <Feedback isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

export default Settings;