import { useState } from "react";
import { Game } from "./GameCard";
import { Shuffle, RefreshCw } from "lucide-react";

interface RediscoverProps {
  games: Game[];
}

interface Slot {
  label: string;
  emoji: string;
  description: string;
  game: Game | null;
}

function getMonthsAgo(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

function isUnfinished(game: Game): boolean {
  return game.playtime > 0 && game.playtime < game.hltb * 0.3;
}

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function Rediscover({ games }: RediscoverProps) {
  const [slots, setSlots] = useState<Slot[]>([
    { label: "Never Launched", emoji: "🕹️", description: "Installed but never played", game: null },
    { label: "Long Lost", emoji: "💀", description: "Haven't played in 6+ months", game: null },
    { label: "Left Unfinished", emoji: "⏳", description: "Started but never completed", game: null },
  ]);
  const [revealed, setRevealed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const pick = () => {
    setSpinning(true);
    setIsResetting(true);

    setTimeout(() => {
      const neverPlayed = games.filter((g) => g.playtime === 0);
      const longLost = games.filter(
        (g) => g.lastPlayed && getMonthsAgo(g.lastPlayed) >= 6 && g.playtime > 0
      );
      const unfinished = games.filter((g) => isUnfinished(g));

      const picked = [
        { label: "Never Launched", emoji: "🕹️", description: "Installed but never played", game: pickRandom(neverPlayed) },
        { label: "Long Lost", emoji: "💀", description: "Haven't played in 6+ months", game: pickRandom(longLost) },
        { label: "Left Unfinished", emoji: "⏳", description: "Started but never completed", game: pickRandom(unfinished) },
      ];

      setSpinning(false);

      // Reveal one slot at a time with stagger
      picked.forEach((_, i) => {
        setTimeout(() => {
          setSlots((prev) => {
            const next = [...prev];
            next[i] = picked[i];
            return next;
          });
          if (i === picked.length - 1) {
            setRevealed(true);
            setIsResetting(false); // Only set false after last slot
          }
        }, 300 + i * 800); // 300ms initial delay then 800ms between each card
      });
    }, 600);
  };

  const reroll = (index: number) => {
    const pools = [
      games.filter((g) => g.playtime === 0),
      games.filter((g) => g.lastPlayed && getMonthsAgo(g.lastPlayed) >= 6 && g.playtime > 0),
      games.filter((g) => isUnfinished(g)),
    ];

    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], game: pickRandom(pools[index]) };
    setSlots(newSlots);
  };

  return (
    <div className="rediscover">
      <div className="rediscover-header">
        <div>
          <h2 className="rediscover-title">Rediscover</h2>
          <p className="rediscover-subtitle">Games you've forgotten about</p>
        </div>
        <button className={`rediscover-btn ${spinning ? "spinning" : ""}`} onClick={pick}>
          <Shuffle size={16} />
          {spinning ? "Finding..." : "Pick For Me"}
        </button>
      </div>

      <div className="rediscover-slots">
        {slots.map((slot, i) => (
          <div key={i} className={`rediscover-slot ${slot.game && !isResetting ? "revealed" : ""}`}>
            {slot.game && !isResetting ? (
              <>
                <div className="slot-cover">
                  <img src={slot.game.cover} alt={slot.game.title} />
                  <div className="slot-cover-overlay" />
                </div>
                <div className="slot-content">
                  <span className="slot-emoji">{slot.emoji}</span>
                  <p className="slot-label">{slot.label}</p>
                  <h3 className="slot-game-title">{slot.game.title}</h3>
                  <p className="slot-reason">
                    {slot.game.playtime === 0
                      ? "Never been launched"
                      : slot.game.lastPlayed
                      ? `Last played ${getMonthsAgo(slot.game.lastPlayed)} months ago`
                      : `Only ${slot.game.playtime}hrs of ${slot.game.hltb}hrs completed`}
                  </p>
                  <div className="slot-actions">
                    <button className="slot-play-btn">▶ Play</button>
                    <button className="slot-reroll-btn" onClick={() => reroll(i)}>
                      <RefreshCw size={12} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="slot-empty">
                <span className="slot-emoji">{slot.emoji}</span>
                <p className="slot-label">{slot.label}</p>
                <p className="slot-description">{slot.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rediscover;