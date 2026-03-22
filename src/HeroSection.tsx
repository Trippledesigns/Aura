import { useState, useEffect } from "react";
import { Play, Clock, TrendingUp, Star } from "lucide-react";
import { Game } from "./GameCard";
import { invoke } from "@tauri-apps/api/core";

interface HeroSectionProps {
  games: Game[];
}

interface FeaturedGame extends Game {
  reason: string;
  type: "recent" | "trending" | "recommended";
}

function HeroSection({ games }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [featuredGames, setFeaturedGames] = useState<FeaturedGame[]>([]);

  const launchGame = async (game: Game) => {
    try {
      await invoke("launch_game", {
        id: String(game.id),
        platform: game.platform,
        launchCommand: game.launchCommand,
        processName: game.processName,
      });
    } catch (error) {
      console.error("Failed to launch game:", error);
    }
  };

  const nextSlide = () => {
    console.log("Next slide clicked");
    setCurrentIndex((prev) => (prev + 1) % featuredGames.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    const generateFeaturedGames = (): FeaturedGame[] => {
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      
      // Recently played games
      const recent = games
        .filter(g => g.lastPlayed && new Date(g.lastPlayed).getTime() > oneWeekAgo)
        .slice(0, 3)
        .map(g => ({ ...g, reason: "Continue your adventure", type: "recent" as const }));

      // Most played games (trending)
      const trending = games
        .filter(g => g.playtime > 10)
        .sort((a, b) => b.playtime - a.playtime)
        .slice(0, 2)
        .map(g => ({ ...g, reason: "Your favorite", type: "trending" as const }));

      // Random unplayed game (recommended)
      const unplayed = games.filter(g => g.playtime === 0);
      const recommended = unplayed.length > 0 
        ? [unplayed[Math.floor(Math.random() * unplayed.length)]]
          .map(g => ({ ...g, reason: "Try something new", type: "recommended" as const }))
        : [];

      return [...recent, ...trending, ...recommended].slice(0, 5);
    };

    setFeaturedGames(generateFeaturedGames());
  }, [games]);

  useEffect(() => {
    if (featuredGames.length <= 1) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [featuredGames.length]);

  if (featuredGames.length === 0) {
    return (
      <div className="hero-section hero-empty">
        <div className="hero-empty-content">
          <Play size={48} color="rgba(255,255,255,0.2)" />
          <h2>No games yet</h2>
          <p>Add some games to get started</p>
        </div>
      </div>
    );
  }

  const currentGame = featuredGames[currentIndex];

  return (
    <div className="hero-section">
      <div className="hero-carousel">
        <div className="hero-content">
          <div className="hero-background">
            <img
              src={currentGame.cover}
              alt={currentGame.title}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="hero-overlay" />
          </div>

          <div className="hero-info">
            <div className="hero-meta">
              <span className={`hero-badge hero-badge-${currentGame.type}`}>
                {currentGame.type === "recent" && <Clock size={12} />}
                {currentGame.type === "trending" && <TrendingUp size={12} />}
                {currentGame.type === "recommended" && <Star size={12} />}
                {currentGame.type}
              </span>
              <span className="hero-platform">{currentGame.platform}</span>
            </div>

            <h2 className="hero-title">{currentGame.title}</h2>
            <p className="hero-reason">{currentGame.reason}</p>
            
            <div className="hero-stats">
              {currentGame.playtime > 0 && (
                <div className="hero-stat">
                  <Clock size={14} />
                  <span>{currentGame.playtime}h played</span>
                </div>
              )}
              <div className="hero-stat">
                <Star size={14} />
                <span>{currentGame.genre}</span>
              </div>
            </div>

            <button 
              className="hero-play-btn"
              onClick={() => launchGame(currentGame)}
            >
              <Play size={16} />
              Play Now
            </button>
          </div>
        </div>
      </div>

      {featuredGames.length > 1 && (
        <div className="hero-indicators">
          {featuredGames.map((_, index) => (
            <button
              key={index}
              className={`hero-indicator ${index === currentIndex ? "active" : ""}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HeroSection;
