import { useState } from "react";
import { Game } from "./GameCard";
import { Sparkles } from "lucide-react";

interface MoodPickerProps {
  games: Game[];
}

const MOODS = [
  { emoji: "🧠", label: "Brain Off", description: "Just vibes, no thinking", genres: ["Simulation", "Platformer"], maxPlaytime: 60 },
  { emoji: "😌", label: "Chill", description: "Relaxed, easy going", genres: ["Simulation", "Platformer", "Strategy"], maxPlaytime: 80 },
  { emoji: "⚡", label: "Focused", description: "I'm in the zone", genres: ["Strategy", "RPG", "Roguelike"], maxPlaytime: 999 },
  { emoji: "🔥", label: "Pumped", description: "Let's go, full energy", genres: ["Shooter", "Roguelike", "Racing"], maxPlaytime: 999 },
  { emoji: "📖", label: "Story Mode", description: "I want to get lost in a world", genres: ["RPG"], maxPlaytime: 999 },
  { emoji: "⏱️", label: "Quick Session", description: "30 mins max, pick up and quit", genres: ["Roguelike", "Platformer", "Racing"], maxPlaytime: 30 },
];

const TIME_OPTIONS = [
  { label: "30 mins", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "All night", value: 999 },
];

function MoodPicker({ games }: MoodPickerProps) {
  const [selectedMood, setSelectedMood] = useState<typeof MOODS[0] | null>(null);
  const [selectedTime, setSelectedTime] = useState<typeof TIME_OPTIONS[0] | null>(null);
  const [suggestion, setSuggestion] = useState<Game | null>(null);
  const [thinking, setThinking] = useState(false);

  const findGame = () => {
    if (!selectedMood) return;
    setThinking(true);
    setSuggestion(null);

    setTimeout(() => {
      let pool = games.filter((g) =>
        selectedMood.genres.some((genre) => g.genre === genre)
      );

      if (selectedTime && selectedTime.value !== 999) {
        pool = pool.filter((g) => g.hltb <= selectedTime.value);
      }

      if (pool.length === 0) pool = games;

      const pick = pool[Math.floor(Math.random() * pool.length)];
      setSuggestion(pick);
      setThinking(false);
    }, 1200);
  };

  return (
    <div className="mood-picker">
      <div className="mood-header">
        <div>
          <h2 className="mood-title">What's your mood?</h2>
          <p className="mood-subtitle">Tell Aura how you're feeling</p>
        </div>
      </div>

      {/* Mood Selection */}
      <div className="mood-grid">
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            className={`mood-option ${selectedMood?.label === mood.label ? "active" : ""}`}
            onClick={() => { setSelectedMood(mood); setSuggestion(null); }}
          >
            <span className="mood-option-emoji">{mood.emoji}</span>
            <span className="mood-option-label">{mood.label}</span>
            <span className="mood-option-desc">{mood.description}</span>
          </button>
        ))}
      </div>

      {/* Time Selection */}
      {selectedMood && (
        <div className="time-selection">
          <p className="time-label">How much time do you have?</p>
          <div className="time-options">
            {TIME_OPTIONS.map((time) => (
              <button
                key={time.label}
                className={`time-btn ${selectedTime?.label === time.label ? "active" : ""}`}
                onClick={() => { setSelectedTime(time); setSuggestion(null); }}
              >
                {time.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Find Game Button */}
      {selectedMood && selectedTime && (
        <button
          className={`find-game-btn ${thinking ? "thinking" : ""}`}
          onClick={findGame}
        >
          <Sparkles size={16} />
          {thinking ? "Finding your game..." : "Find My Game"}
        </button>
      )}

      {/* Suggestion */}
      {suggestion && !thinking && (
        <div className="mood-suggestion">
          <div className="suggestion-cover">
            <img src={suggestion.cover} alt={suggestion.title} />
            <div className="suggestion-overlay" />
          </div>
          <div className="suggestion-content">
            <p className="suggestion-for">
              {selectedMood?.emoji} Perfect for {selectedMood?.label} mode
            </p>
            <h3 className="suggestion-title">{suggestion.title}</h3>
            <p className="suggestion-reason">
              {suggestion.playtime === 0
                ? "You've never played this — perfect time to start"
                : `You have ${suggestion.playtime}hrs in this game`}
            </p>
            <div className="suggestion-actions">
              <button className="suggestion-play-btn">▶ Play Now</button>
              <button className="suggestion-skip-btn" onClick={findGame}>
                Try Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoodPicker;