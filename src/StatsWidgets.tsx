import { useMemo } from "react";
import { Game } from "./GameCard";
import { BarChart3, Clock, Trophy, Target, TrendingUp, Calendar } from "lucide-react";

interface StatsWidgetsProps {
  games: Game[];
}

function StatsWidgets({ games }: StatsWidgetsProps) {
  const stats = useMemo(() => {
    const total = games.length;
    const played = games.filter(g => g.playtime > 0);
    const neverPlayed = total - played.length;
    const totalHours = games.reduce((acc, g) => acc + g.playtime, 0);
    const avgHours = total > 0 ? totalHours / total : 0;
    
    // This week's playtime
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = games.filter(g => 
      g.lastPlayed && new Date(g.lastPlayed).getTime() > oneWeekAgo
    ).length;

    // Gaming streak (consecutive days with playtime)
    const streak = calculateGamingStreak(games);

    return {
      total,
      played: played.length,
      neverPlayed,
      totalHours,
      avgHours,
      thisWeek,
      streak,
      completionRate: total > 0 ? Math.round((played.length / total) * 100) : 0
    };
  }, [games]);

  function calculateGamingStreak(games: Game[]): number {
    const playDates = games
      .filter(g => g.lastPlayed)
      .map(g => new Date(g.lastPlayed!).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (playDates.length === 0) return 0;
    
    let streak = 1;
    const today = new Date().toDateString();
    
    if (playDates[0] !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (playDates[0] !== yesterday.toDateString()) return 0;
    }

    for (let i = 1; i < playDates.length; i++) {
      const currentDate = new Date(playDates[i - 1]);
      const prevDate = new Date(playDates[i]);
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  const widgets = [
    {
      title: "Library Size",
      value: stats.total.toString(),
      subtitle: "total games",
      icon: <BarChart3 size={20} />,
      color: "var(--accent)",
      trend: null
    },
    {
      title: "Hours Played",
      value: Math.round(stats.totalHours).toString(),
      subtitle: "total hours",
      icon: <Clock size={20} />,
      color: "#38bdf8",
      trend: null
    },
    {
      title: "Completion",
      value: `${stats.completionRate}%`,
      subtitle: "games played",
      icon: <Target size={20} />,
      color: "#34d399",
      trend: stats.completionRate >= 50 ? "up" : "down"
    },
    {
      title: "This Week",
      value: stats.thisWeek.toString(),
      subtitle: "games played",
      icon: <Calendar size={20} />,
      color: "#fb923c",
      trend: stats.thisWeek > 0 ? "up" : null
    },
    {
      title: "Gaming Streak",
      value: `${stats.streak} days`,
      subtitle: "consecutive days",
      icon: <Trophy size={20} />,
      color: "#f472b6",
      trend: stats.streak >= 3 ? "up" : null
    },
    {
      title: "Avg Session",
      value: stats.avgHours < 1 ? "<1h" : `${Math.round(stats.avgHours)}h`,
      subtitle: "per game",
      icon: <TrendingUp size={20} />,
      color: "#c084fc",
      trend: null
    }
  ];

  return (
    <div className="stats-widgets">
      <div className="stats-widgets-header">
        <h3 className="stats-widgets-title">Your Gaming Stats</h3>
        <p className="stats-widgets-subtitle">Quick overview of your gaming habits</p>
      </div>
      
      <div className="stats-widgets-grid">
        {widgets.map((widget, index) => (
          <div key={index} className="stats-widget">
            <div className="stats-widget-icon" style={{ color: widget.color }}>
              {widget.icon}
            </div>
            <div className="stats-widget-content">
              <h4 className="stats-widget-title">{widget.title}</h4>
              <p className="stats-widget-value">{widget.value}</p>
              <p className="stats-widget-subtitle">{widget.subtitle}</p>
            </div>
            {widget.trend && (
              <div className={`stats-widget-trend stats-widget-trend-${widget.trend}`}>
                <TrendingUp size={12} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StatsWidgets;
