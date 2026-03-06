interface Theme {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const THEMES: Theme[] = [
  { id: "midnight", name: "Midnight", emoji: "🌑", color: "#a78bfa" },
  { id: "ember", name: "Ember", emoji: "🔥", color: "#fb923c" },
  { id: "arctic", name: "Arctic", emoji: "🌊", color: "#38bdf8" },
  { id: "sakura", name: "Sakura", emoji: "🌸", color: "#f472b6" },
  { id: "nebula", name: "Nebula", emoji: "💜", color: "#c084fc" },
];

interface ThemeSwitcherProps {
  activeTheme: string;
  onThemeChange: (theme: string) => void;
}

function ThemeSwitcher({ activeTheme, onThemeChange }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher">
      <p className="mode-label">Theme</p>
      <div className="theme-options">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            className={`theme-dot ${activeTheme === theme.id ? "active" : ""}`}
            style={{ background: theme.color }}
            title={theme.name}
            onClick={() => onThemeChange(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default ThemeSwitcher;
