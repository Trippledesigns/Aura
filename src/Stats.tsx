import { useMemo } from "react";
import { Game } from "./GameCard";

interface StatsProps {
  games: Game[];
}

function Stats({ games }: StatsProps) {
  const stats = useMemo(() => {
    const total = games.length;
    const neverPlayed = games.filter((g) => g.playtime === 0).length;
    const played = total - neverPlayed;
    const percentPlayed = total > 0 ? Math.round((played / total) * 100) : 0;
    const percentUnplayed = 100 - percentPlayed;
    const totalHours = games.reduce((acc, g) => acc + g.playtime, 0);
    const mostPlayed = games.reduce((a, b) => (a.playtime > b.playtime ? a : b), games[0]);
    const platformCounts = games.reduce((acc, g) => {
      acc[g.platform] = (acc[g.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const longestUnplayed = games
      .filter((g) => g.playtime === 0)
      .sort((a, b) => (a.title > b.title ? 1 : -1))[0];

    return {
      total,
      neverPlayed,
      played,
      percentPlayed,
      percentUnplayed,
      totalHours,
      mostPlayed,
      platformCounts,
      longestUnplayed,
    };
  }, [games]);

  const shameLevel = () => {
    if (stats.percentUnplayed >= 80) return { label: "Legendary Hoarder", emoji: "💀", color: "#f87171" };
    if (stats.percentUnplayed >= 60) return { label: "Serious Backlog", emoji: "😬", color: "#fb923c" };
    if (stats.percentUnplayed >= 40) return { label: "Getting There", emoji: "😅", color: "#fbbf24" };
    if (stats.percentUnplayed >= 20) return { label: "Decent Gamer", emoji: "😊", color: "#34d399" };
    return { label: "True Gamer", emoji: "🏆", color: "var(--accent)" };
  };

  const shame = shameLevel();

  return (
    <div className="stats-page">
      <div className="topbar">
        <h1 className="page-title">Library Stats</h1>
      </div>

      {/* Shame Card */}
      <div className="shame-card" style={{ borderColor: shame.color + "44" }}>
        <div className="shame-emoji">{shame.emoji}</div>
        <div className="shame-content">
          <p className="shame-level" style={{ color: shame.color }}>{shame.label}</p>
          <p className="shame-text">
            You own <strong>{stats.total}</strong> games and have only played{" "}
            <strong>{stats.percentPlayed}%</strong> of them
          </p>
          <p className="shame-subtext">
            That's <strong>{stats.neverPlayed}</strong> games you've never launched 😬
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stats-card">
          <h3>Total Games</h3>
          <p className="stats-value">{stats.total}</p>
        </div>
        <div className="stats-card">
          <h3>Total Playtime</h3>
          <p className="stats-value">{stats.totalHours}hrs</p>
        </div>
        <div className="stats-card">
          <h3>Average Playtime</h3>
          <p className="stats-value">{stats.totalHours / stats.total}hrs</p>
        </div>
        <div className="stats-card">
          <h3>Most Played</h3>
          <p className="stats-value">{stats.mostPlayed?.title || "N/A"}</p>
        </div>
        <p className="stats-note">
          Playtime tracking via Aura is now available for all games!
        </p>
        <div className="stat-card">
          <p className="stat-value">{stats.total}</p>
          <p className="stat-label">Total Games</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{stats.played}</p>
          <p className="stat-label">Played</p>
        </div>
        <div className="stat-card">
          <p className="stat-value" style={{ color: "#f87171" }}>{stats.neverPlayed}</p>
          <p className="stat-label">Never Played</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{stats.totalHours}h</p>
          <p className="stat-label">Total Playtime</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="stats-section">
        <p className="stats-section-title">Library Completion</p>
        <div className="completion-bar">
          <div
            className="completion-fill"
            style={{ width: `${stats.percentPlayed}%`, background: shame.color }}
          />
        </div>
        <div className="completion-labels">
          <span style={{ color: shame.color }}>{stats.percentPlayed}% played</span>
          <span style={{ color: "#f87171" }}>{stats.percentUnplayed}% unplayed</span>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="stats-section">
        <p className="stats-section-title">By Platform</p>
        <div className="platform-breakdown">
          {Object.entries(stats.platformCounts).map(([platform, count]) => (
            <div key={platform} className="platform-stat">
              <div className="platform-stat-info">
                <span className="platform-stat-name">{platform}</span>
                <span className="platform-stat-count">{count} games</span>
              </div>
              <div className="platform-stat-bar">
                <div
                  className="platform-stat-fill"
                  style={{ width: `${(count / stats.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Played */}
      {stats.mostPlayed && stats.mostPlayed.playtime > 0 && (
        <div className="stats-section">
          <p className="stats-section-title">Most Played</p>
          <div className="highlight-game">
            <div className="highlight-cover">
              <img
                src={stats.mostPlayed.cover}
                alt={stats.mostPlayed.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="highlight-info">
              <h3>{stats.mostPlayed.title}</h3>
              <p>{stats.mostPlayed.playtime} hours played</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stats;