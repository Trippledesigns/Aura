import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Game {
  id: number | string;
  title: string;
  genre: string;
  platform: string;
  playtime: number;
  hltb: number;
  lastPlayed: string | null;
  cover: string;
  launchCommand?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  Steam: "#1b9ee8",
  Epic: "#2eff7b",
  GOG: "#b054f5",
  Local: "#ff8c42",
};

function GameCard({ game }: { game: Game }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          // Preload image when it comes into view
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
      await invoke("launch_game", { launchCommand: game.launchCommand });
      await invoke("save_recent_game", {
        gameId: String(game.id),
        gameName: game.title,
        platform: game.platform,
        cover: game.cover,
      });
    }
  };

  return (
    <div className="game-card">
      <div className="game-cover">
        <img 
          ref={imgRef}
          src={isInView ? game.cover : ''}
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
          <button className="launch-btn" onClick={handleLaunch}>▶ Play</button>
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
        <p className="game-playtime">{game.playtime > 0 ? `${game.playtime}hrs played` : "Never played"}</p>
      </div>
    </div>
  );
}

export type { Game };
export default GameCard;