import { Game } from "./GameCard";
import { Calendar } from "lucide-react";

interface OnThisDayProps {
  games: Game[];
}

function OnThisDay({ games }: OnThisDayProps) {
  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  const currentYear = today.getFullYear();

  // Find games played on this day in a previous year
  const matches = games.filter((g) => {
    if (!g.lastPlayed) return false;
    const played = new Date(g.lastPlayed);
    return (
      played.getMonth() === todayMonth &&
      played.getDate() === todayDate &&
      played.getFullYear() < currentYear
    );
  });

  if (matches.length === 0) return null;

  const game = matches[0];
  const yearsAgo = currentYear - new Date(game.lastPlayed!).getFullYear();

  return (
    <div className="on-this-day">
      <div className="on-this-day-left">
        <Calendar size={14} color="var(--accent)" />
        <span className="on-this-day-label">On this day</span>
        <span className="on-this-day-text">
          {yearsAgo} year{yearsAgo !== 1 ? "s" : ""} ago you were playing
        </span>
        <span className="on-this-day-game">{game.title}</span>
      </div>
      {game.cover && (
        <img
          src={game.cover}
          alt={game.title}
          className="on-this-day-cover"
        />
      )}
    </div>
  );
}

export default OnThisDay;