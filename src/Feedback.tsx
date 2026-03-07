import { useState } from "react";
import { X, MessageSquare, Send } from "lucide-react";

interface FeedbackProps {
  isOpen: boolean;
  onClose: () => void;
}

function Feedback({ isOpen, onClose }: FeedbackProps) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"bug" | "feature" | "general">("general");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);

    const WEBHOOK_URL = "https://discord.com/api/webhooks/1479939155709526239/9tf3-bglbim7BGa4XScxEozgYo-VYhBxnzzKPJVuAfy8RglRPf9Et4c6L9hWAJcZ17cX";

    const emoji = type === "bug" ? "🐛" : type === "feature" ? "✨" : "💬";
    const label = type === "bug" ? "Bug Report" : type === "feature" ? "Feature Request" : "General Feedback";

    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `${emoji} ${label}`,
            description: message,
            color: type === "bug" ? 0xff4444 : type === "feature" ? 0xa78bfa : 0x38bdf8,
            footer: { text: "Aura Feedback" },
            timestamp: new Date().toISOString(),
          }]
        })
      });

      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 2000);
    } catch {
      console.error("Failed to send feedback");
    }

    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <MessageSquare size={18} color="var(--accent)" />
            <h2 className="modal-title">Send Feedback</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div className="feedback-sent">
            <p>✅ Thanks for your feedback!</p>
          </div>
        ) : (
          <>
            <div className="modal-body">
              <div className="feedback-types">
                {(["bug", "feature", "general"] as const).map((t) => (
                  <button
                    key={t}
                    className={`feedback-type-btn ${type === t ? "active" : ""}`}
                    onClick={() => setType(t)}
                  >
                    {t === "bug" ? "🐛 Bug" : t === "feature" ? "✨ Feature" : "💬 General"}
                  </button>
                ))}
              </div>
              <textarea
                className="feedback-textarea"
                placeholder={
                  type === "bug"
                    ? "Describe the bug — what happened and what you expected..."
                    : type === "feature"
                    ? "What feature would you love to see in Aura?"
                    : "Share your thoughts about Aura..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-skip" onClick={onClose}>Cancel</button>
              <button
                className="modal-update-btn"
                onClick={handleSend}
                disabled={sending || !message.trim()}
              >
                <Send size={14} />
                {sending ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Feedback;