import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clock } from "lucide-react";

interface RecentGame {
  id: string;
  name: string;
  platform: string;
  cover: string;
  played_at: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  Steam: "#1b9ee8",
  Epic: "#2eff7b",
  GOG: "#b054f5",
  Ubisoft: "#ffffff",
  Local: "#ff8c42",
};

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function Recent() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);

  useEffect(() => {
    invoke<RecentGame[]>("get_recent_games").then(setRecentGames);
  }, []);

  if (recentGames.length === 0) {
    return (
      <div className="recent-empty">
        <Clock size={48} color="rgba(255,255,255,0.1)" />
        <h2>No recent games yet</h2>
        <p>Games you launch from Aura will appear here</p>
      </div>
    );
  }

  return (
    <div className="recent-page">
      <div className="topbar">
        <h1 className="page-title">Recently Played</h1>
        <p className="game-count">{recentGames.length} games</p>
      </div>

      <div className="recent-list">
        {recentGames.map((game) => (
          <div key={game.id} className="recent-item">
            <div className="recent-cover">
              <img
                src={game.cover}
                alt={game.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.style.background =
                    "linear-gradient(135deg, var(--accent-dim), rgba(10,10,20,0.8))";
                }}
              />
            </div>
            <div className="recent-info">
              <h3 className="recent-title">{game.name}</h3>
              <span
                className="recent-platform"
                style={{ color: PLATFORM_COLORS[game.platform] }}
              >
                {game.platform}
              </span>
            </div>
            <div className="recent-time">
              <Clock size={12} />
              <span>{timeAgo(game.played_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Recent;
