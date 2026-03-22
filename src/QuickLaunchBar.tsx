import { useState } from "react";
import { Play, Plus, Star, Clock, TrendingUp } from "lucide-react";
import { Game } from "./GameCard";

interface QuickLaunchBarProps {
  games: Game[];
  onLaunch?: (game: Game) => void;
}

interface QuickLaunchGame extends Game {
  lastPlayedRecent?: boolean;
  isFavorite?: boolean;
}

function QuickLaunchBar({ games, onLaunch }: QuickLaunchBarProps) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("aura-favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // Get quick launch games (favorites + recently played + most played)
  const getQuickLaunchGames = (): QuickLaunchGame[] => {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    // Favorites
    const favGames = games
      .filter(g => favorites.includes(String(g.id)))
      .map(g => ({ ...g, isFavorite: true }));

    // Recently played (last 3 days)
    const recentGames = games
      .filter(g => g.lastPlayed && new Date(g.lastPlayed).getTime() > threeDaysAgo)
      .slice(0, 3)
      .map(g => ({ ...g, lastPlayedRecent: true }));

    // Most played (excluding favorites and recent)
    const mostPlayed = games
      .filter(g => g.playtime > 5 && !favorites.includes(String(g.id)) && 
              (!g.lastPlayed || new Date(g.lastPlayed).getTime() <= threeDaysAgo))
      .sort((a, b) => b.playtime - a.playtime)
      .slice(0, 2);

    // Combine and remove duplicates
    const allGames = [...favGames, ...recentGames, ...mostPlayed];
    const uniqueGames = allGames.filter((game, index, self) => 
      index === self.findIndex(g => g.id === game.id)
    );

    return uniqueGames.slice(0, 8); // Max 8 games
  };

  const quickLaunchGames = getQuickLaunchGames();

  const toggleFavorite = (gameId: string) => {
    const newFavorites = favorites.includes(gameId)
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];
    
    setFavorites(newFavorites);
    localStorage.setItem("aura-favorites", JSON.stringify(newFavorites));
  };

  const handleLaunch = (game: Game) => {
    if (onLaunch) {
      onLaunch(game);
    }
  };

  if (quickLaunchGames.length === 0) {
    return (
      <div className="quick-launch-bar quick-launch-empty">
        <div className="quick-launch-empty-content">
          <Clock size={24} color="rgba(255,255,255,0.2)" />
          <p>Play some games to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-launch-bar">
      <div className="quick-launch-header">
        <h3 className="quick-launch-title">
          <Play size={16} />
          Quick Launch
        </h3>
        <div className="quick-launch-badges">
          {quickLaunchGames.some(g => g.isFavorite) && (
            <span className="quick-launch-badge">
              <Star size={12} /> Favorites
            </span>
          )}
          {quickLaunchGames.some(g => g.lastPlayedRecent) && (
            <span className="quick-launch-badge">
              <Clock size={12} /> Recent
            </span>
          )}
          {quickLaunchGames.some(g => g.playtime > 10) && (
            <span className="quick-launch-badge">
              <TrendingUp size={12} /> Most Played
            </span>
          )}
        </div>
      </div>

      <div className="quick-launch-grid">
        {quickLaunchGames.map((game) => (
          <div key={game.id} className="quick-launch-item">
            <div className="quick-launch-cover">
              <img
                src={game.cover}
                alt={game.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.style.background =
                    "linear-gradient(135deg, var(--accent-dim), rgba(10,10,20,0.8))";
                }}
              />
              <div className="quick-launch-overlay">
                <button 
                  className="quick-launch-play"
                  onClick={() => handleLaunch(game)}
                >
                  <Play size={14} />
                </button>
                <button 
                  className={`quick-launch-favorite ${game.isFavorite ? "active" : ""}`}
                  onClick={() => toggleFavorite(String(game.id))}
                >
                  <Star size={12} fill={game.isFavorite ? "currentColor" : "none"} />
                </button>
              </div>
              {game.lastPlayedRecent && (
                <div className="quick-launch-indicator recent">
                  <Clock size={8} />
                </div>
              )}
              {game.isFavorite && (
                <div className="quick-launch-indicator favorite">
                  <Star size={8} fill="currentColor" />
                </div>
              )}
            </div>
            <div className="quick-launch-info">
              <p className="quick-launch-title">{game.title}</p>
              <div className="quick-launch-meta">
                <span className="quick-launch-platform">{game.platform}</span>
                {game.playtime > 0 && (
                  <span className="quick-launch-playtime">{game.playtime}h</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Add more button */}
        <button className="quick-launch-add">
          <div className="quick-launch-add-content">
            <Plus size={20} />
            <span>Add More</span>
          </div>
        </button>
      </div>
    </div>
  );
}

export default QuickLaunchBar;
