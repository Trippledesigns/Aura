import { useState } from "react";
import { Game } from "./GameCard";
import { Shuffle, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface RandomPickerProps {
  games: Game[];
}

function RandomPicker({ games }: RandomPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayTitle, setDisplayTitle] = useState("...");
  const [pickedGame, setPickedGame] = useState<Game | null>(null);

  const playableGames = games.length > 0 ? games : [];

  const spin = () => {
    if (playableGames.length === 0) return;

    setPickedGame(null);
    setIsSpinning(true);
    setDisplayTitle("...");

    const winner = playableGames[Math.floor(Math.random() * playableGames.length)];

    let count = 0;
    const maxCount = 20;

    const interval = setInterval(() => {
      const random = playableGames[Math.floor(Math.random() * playableGames.length)];
      setDisplayTitle(random.title);
      count++;

      if (count >= maxCount) {
        clearInterval(interval);
        setDisplayTitle(winner.title);
        setPickedGame(winner);
        setIsSpinning(false);
      }
    }, 100);
  };

  const handlePlay = async () => {
    if (pickedGame?.launchCommand) {
      await invoke("launch_and_track", {
        gameId: String(pickedGame.id),
        launchCommand: pickedGame.launchCommand,
        processName: pickedGame.processName || "",
      });
      await invoke("save_recent_game", {
        gameId: String(pickedGame.id),
        gameName: pickedGame.title,
        platform: pickedGame.platform,
        cover: pickedGame.cover,
      });
      setIsOpen(false);
    }
  };

  const handleOpen = () => {
    if (games.length === 0) {
      alert("No games found!");
      return;
    }
    setIsOpen(true);
    setPickedGame(null);
    setDisplayTitle("...");
    setTimeout(() => spin(), 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsSpinning(false);
    setPickedGame(null);
  };

  return (
    <>
      <button className="random-picker-btn" onClick={handleOpen}>
        <Shuffle size={14} />
        Feeling Lucky
      </button>

      {isOpen && (
        <div className="random-picker-overlay" onClick={handleClose}>
          <div className="random-picker-modal" onClick={(e) => e.stopPropagation()}>
            <button className="random-picker-close" onClick={handleClose}>
              <X size={14} />
            </button>

            <p className="random-picker-label">
              {isSpinning ? "Finding your game..." : "Tonight you're playing"}
            </p>

            <div className={`random-picker-title ${isSpinning ? "spinning" : "revealed"}`}>
              {displayTitle}
            </div>

            {!isSpinning && pickedGame && (
              <div className="random-picker-game">
                <img
                  src={pickedGame.cover}
                  alt={pickedGame.title}
                  className="random-picker-cover"
                />
                <div className="random-picker-meta">
                  <span className="random-picker-platform">{pickedGame.platform}</span>
                  <span className="random-picker-playtime">
                    {pickedGame.playtime > 0 ? `${pickedGame.playtime}hrs played` : "Never played"}
                  </span>
                </div>
                <div className="random-picker-actions">
                  <button className="random-picker-play" onClick={handlePlay}>
                    ▶ Play Now
                  </button>
                  <button className="random-picker-reroll" onClick={spin}>
                    <Shuffle size={14} />
                    Reroll
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default RandomPicker;