import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Pin, Trash2 } from "lucide-react";

interface Game {
  id: number | string;
  title: string;
  genre: string;
  platform: string;
  playtime: number;
  auraPlaytime?: number; // NEW - minutes tracked by Aura
  hltb: number;
  lastPlayed: string | null;
  cover: string;
  launchCommand?: string;
  processName?: string; // NEW
}

const PLATFORM_COLORS: Record<string, string> = {
  Steam: "#1b9ee8",
  Epic: "#2eff7b",
  GOG: "#b054f5",
  Local: "#ff8c42",
};

interface GameCardProps {
  game: Game;
  isPinned?: boolean;
  onTogglePin?: (id: string | number) => void;
  onUninstall?: (id: string | number) => void;
}

function GameCard({ game, isPinned = false, onTogglePin, onUninstall }: GameCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const displayPlaytime = () => {
    if (game.platform === "Steam" && game.playtime > 0) {
      return `${game.playtime}hrs on Steam`;
    }
    if (game.auraPlaytime && game.auraPlaytime > 0) {
      const hours = Math.floor(game.auraPlaytime / 60);
      const mins = game.auraPlaytime % 60;
      return hours > 0 ? `${hours}hrs ${mins}m via Aura` : `${mins}m via Aura`;
    }
    if (game.platform === "Steam") {
      return "Never played";
    }
    return "Play via Aura to track time";
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (imgRef.current && !isLoaded) {
            const img = new Image();
            img.src = game.cover;
            img.onload = () => {
              setIsLoaded(true);
              observer.disconnect();
            };
          }
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [game.cover, isLoaded]);

  const handleLaunch = async () => {
    if (game.launchCommand) {
      await invoke("launch_and_track", {
        gameId: String(game.id),
        launchCommand: game.launchCommand,
        processName: game.processName || "",
      });
      await invoke("save_recent_game", {
        gameId: String(game.id),
        gameName: game.title,
        platform: game.platform,
        cover: game.cover,
      });
    }
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin?.(game.id);
  };

  const handleUninstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmUninstall) {
      setConfirmUninstall(true);
      setTimeout(() => setConfirmUninstall(false), 3000);
      return;
    }
    await invoke("uninstall_game", {
      platform: game.platform,
      gameId: String(game.id),
      launchCommand: game.launchCommand || "",
    });
    onUninstall?.(game.id);
    setConfirmUninstall(false);
  };

  return (
    <div className={`game-card ${isPinned ? "pinned" : ""}`}>
      <div className="game-cover">
        <img
          ref={imgRef}
          src={isInView && game.cover ? game.cover : undefined}
          alt={game.title}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).parentElement!.style.background =
              "linear-gradient(135deg, rgba(167, 139, 250, 0.2), rgba(10, 10, 20, 0.8))";
          }}
        />
        {!isLoaded && (
          <div className="game-cover-skeleton">
            <div className="skeleton-shimmer" />
          </div>
        )}
        <div className="game-overlay">
          <button
            className={`pin-btn ${isPinned ? "pinned" : ""}`}
            onClick={handlePin}
            title={isPinned ? "Unpin" : "Pin to top"}
          >
            <Pin size={14} />
          </button>
          <button className="launch-btn" onClick={handleLaunch}>▶ Play</button>
          <button
            className={`uninstall-btn ${confirmUninstall ? "confirm" : ""}`}
            onClick={handleUninstall}
            title="Uninstall"
          >
            {confirmUninstall ? "Sure?" : <Trash2 size={12} />}
          </button>
        </div>
      </div>
      <div className="game-info">
        <h3 className="game-title">{game.title}</h3>
        <div className="game-meta">
          <span
            className="platform-badge"
            style={{ color: PLATFORM_COLORS[game.platform] }}
          >
            {game.platform}
          </span>
          <span className="game-genre">{game.genre}</span>
        </div>
        <p className="game-playtime">{displayPlaytime()}</p>
      </div>
      {isPinned && (
        <div className="pinned-badge">
          <Pin size={10} />
        </div>
      )}
    </div>
  );
}

export type { Game };
export default GameCard;