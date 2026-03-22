import { useState, useEffect } from "react";
import { X, Download, Sparkles } from "lucide-react";
import { installUpdate, checkUpdate } from "@tauri-apps/api/updater";
import { listen } from "@tauri-apps/api/event";

interface UpdateModalProps {
  version: string;
  notes: string;
  onClose: () => void;
}

function UpdateModal({ version, notes, onClose }: UpdateModalProps) {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Listen for update availability
    const unlistenAvailable = listen("tauri://update-available", () => {
      setUpdateAvailable(true);
    });

    const unlistenNotAvailable = listen("tauri://update-not-available", () => {
      setUpdateAvailable(false);
    });

    const unlistenDownloadError = listen("tauri://update-download-error", (event) => {
      console.error("Update download failed:", event.payload);
      alert("Update download failed. Please try again.");
      setInstalling(false);
      setProgress(null);
    });

    const unlistenInstalled = listen("tauri://update-installed", () => {
      alert("Update installed! The app will restart.");
      setInstalling(false);
      setProgress(null);
    });

    return () => {
      unlistenAvailable.then(f => f());
      unlistenNotAvailable.then(f => f());
      unlistenDownloadError.then(f => f());
      unlistenInstalled.then(f => f());
    };
  }, []);

  const handleInstall = async () => {
    setInstalling(true);

    // Listen for download progress
    const unlistenProgress = await listen("tauri://update-download-progress", (event) => {
      setProgress(event.payload?.percent ?? null);
    });

    try {
      // Trigger the Tauri updater
      await installUpdate();
    } catch (err) {
      console.error(err);
      alert("Failed to install update: " + err);
    } finally {
      setInstalling(false);
      setProgress(null);
      unlistenProgress();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-group">
            <Sparkles size={20} color="var(--accent)" />
            <h2 className="modal-title">Aura {version} is here!</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-subtitle">What's new in this update:</p>
          <div className="modal-notes">
            {notes.split("\n").filter(Boolean).map((line, i) => (
              <p key={i} className="modal-note-line">{line}</p>
            ))}
          </div>

          {installing && progress !== null && (
            <p>Downloading update: {Math.round(progress * 100)}%</p>
          )}

          {!installing && updateAvailable && (
            <p>Update is ready to install!</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-skip" onClick={onClose}>
            Later
          </button>
          <button
            className="modal-update-btn"
            onClick={handleInstall}
            disabled={installing || !updateAvailable}
          >
            <Download size={14} />
            {installing ? "Installing..." : "Update Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateModal;