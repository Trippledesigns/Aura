import { useState } from "react";
import { X, Download, Sparkles } from "lucide-react";
import { installUpdate } from "./updater";

interface UpdateModalProps {
  version: string;
  notes: string;
  onClose: () => void;
}

function UpdateModal({ version, notes, onClose }: UpdateModalProps) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    await installUpdate();
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
        </div>

        <div className="modal-footer">
          <button className="modal-skip" onClick={onClose}>
            Later
          </button>
          <button
            className="modal-update-btn"
            onClick={handleInstall}
            disabled={installing}
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
