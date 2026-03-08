import { useState, useMemo, useEffect } from "react";
import { Gamepad2, Home, Search, BarChart2, Clock, Settings as SettingsIcon, Sun, Moon, Pin } from "lucide-react";
import GameCard, { Game } from "./GameCard";
import Rediscover from "./Rediscover";
import MoodPicker from "./MoodPicker";
import Settings from "./Settings";
import Recent from "./Recent";
import Stats from "./Stats";
import Onboarding from "./Onboarding";
import RandomPicker from "./RandomPicker";
import OnThisDay from "./OnThisDay";
import UpdateModal from "./UpdateModal";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { metadataCache } from "./cache";
import "./App.css";

const VirtualGrid = ({ children }: { children: React.ReactNode }) => {
  return (
    <div style={{ height: "600px", overflow: "auto" }}>
      {children}
    </div>
  );
};

function App() {
  const [activeMode, setActiveMode] = useState<"all" | "weekday" | "weekend">("all");
  const [activeGenre, setActiveGenre] = useState("All");
  const [steamGames, setSteamGames] = useState<Game[]>([]);
  const [localGames, setLocalGames] = useState<Game[]>([]);
  const [theme, setTheme] = useState("midnight");
  const [localFolders, setLocalFolders] = useState<string[]>([]);
  const [activePage, setActivePage] = useState<"library" | "recent" | "stats" | "settings">("library");
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState<(string | number)[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(() => {
    return localStorage.getItem("aura-onboarded") === "true";
  });
  const [updateInfo, setUpdateInfo] = useState<{ version: string; notes: string } | null>(null);
  const [auraPlaytime, setAuraPlaytime] = useState<Record<string, number>>({});

  const mapGames = (games: any[], platform: string): Game[] =>
    games.map((g) => ({
      id: g.id,
      title: g.name,
      genre: "Unknown",
      platform,
      playtime: g.playtime,
      hltb: 0,
      lastPlayed: g.last_played > 0
        ? new Date(g.last_played * 1000).toISOString().split("T")[0]
        : null,
      cover: g.cover,
      launchCommand: g.launch_command,
      processName: g.process_name || "",
    }));

  const enrichGames = async (games: Game[]) => {
    const unenriched = games.filter((g) => !metadataCache.get(g.title));

    for (const game of unenriched) {
      try {
        const [cover, genre] = await invoke<[string, string]>("enrich_game_metadata", {
          name: game.title,
        });

        metadataCache.set(game.title, cover, genre);

        if (cover || genre !== "Unknown") {
          setSteamGames((prev) =>
            prev.map((g) =>
              g.id === game.id
                ? { ...g, cover: cover || g.cover, genre: genre || g.genre }
                : g
            )
          );
        }
      } catch (err) {
        console.error("Enrich failed for:", game.title);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    // Apply cached data to all games immediately
    setSteamGames((prev) =>
      prev.map((g) => {
        const cached = metadataCache.get(g.title);
        if (cached) {
          return {
            ...g,
            cover: cached.cover || g.cover,
            genre: cached.genre || g.genre,
          };
        }
        return g;
      })
    );
  };

  const loadGames = async () => {
    try {
      const [steamRaw, epicRaw, ubisoftRaw, gogRaw] = await Promise.all([
        invoke<any[]>("scan_steam_games"),
        invoke<any[]>("scan_epic_games"),
        invoke<any[]>("scan_ubisoft_games"),
        invoke<any[]>("scan_gog_games"),
      ]);

      const steam = mapGames(steamRaw, "Steam");
      const other = [
        ...mapGames(epicRaw, "Epic"),
        ...mapGames(ubisoftRaw, "Ubisoft"),
        ...mapGames(gogRaw, "GOG"),
      ];

      setSteamGames([...steam, ...other]);
    enrichGames([...steam, ...other]); // Fire and forget
    } catch (err) {
      console.error("Scan error:", err);
    }
  };

  const handleOnboardingComplete = (games: Game[]) => {
    localStorage.setItem("aura-onboarded", "true");
    setSteamGames(games);
    setOnboardingDone(true);
  };

  const addLocalFolder = async () => {
    const folder = await open({
      directory: true,
      multiple: false,
      title: "Select Games Folder",
    });

    if (folder) {
      try {
        const raw = await invoke<any[]>("scan_local_folder", {
          folderPath: folder,
        });
        const mapped: Game[] = raw.map((g) => ({
          id: g.id,
          title: g.name,
          genre: "Unknown",
          platform: "Local",
          playtime: 0,
          hltb: 0,
          lastPlayed: null,
          cover: g.cover,
          launchCommand: g.launch_command,
        }));
        setLocalGames((prev) => [...prev, ...mapped]);
      } catch (err) {
        console.error("Local scan error:", err);
      }
    }
  };

  const handleTogglePin = (id: string | number) => {
    setPinnedIds((prev) => {
      const newPinned = prev.includes(id)
        ? prev.filter((p) => p !== id)
        : [...prev, id];
      invoke("save_pinned_games", { gameIds: newPinned.map(String) });
      return newPinned;
    });
  };

  const handleUninstall = (id: string | number) => {
    setSteamGames((prev) => prev.filter((g) => g.id !== id));
    setLocalGames((prev) => prev.filter((g) => g.id !== id));
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    invoke("save_settings", {
      theme: newTheme,
      localFolders,
    });
  };

  // Load settings on startup
  useEffect(() => {
    invoke<any>("load_settings").then((settings) => {
      if (settings.theme) setTheme(settings.theme);
      if (settings.local_folders) setLocalFolders(settings.local_folders);
    });
  }, []);

  // Load pinned games on startup
  useEffect(() => {
    invoke<string[]>("get_pinned_games").then((ids) => {
      setPinnedIds(ids);
    });
  }, []);

  // Load games on startup
  useEffect(() => {
    if (onboardingDone) {
      loadGames();
      invoke("start_file_watcher");
    }
  }, [onboardingDone]);

  // Listen for file watcher changes
  useEffect(() => {
    const unlistenPromise = listen("library-changed", () => {
      setTimeout(() => loadGames(), 2000);
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Hide to tray on close
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    const setup = async () => {
      const win = getCurrentWindow();
      unlistenFn = await win.onCloseRequested((event) => {
        event.preventDefault();
        win.hide();
      });
    };
    setup();
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Load Aura playtime on startup
  useEffect(() => {
    invoke<Record<string, number>>("get_aura_playtime").then((pt) => {
      setAuraPlaytime(pt);
    });
  }, []);

  // Listen for playtime updates
  useEffect(() => {
    const unlisten = listen("playtime-updated", () => {
      invoke<Record<string, number>>("get_aura_playtime").then((pt) => {
        setAuraPlaytime(pt);
      });
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const allGames = [...steamGames, ...localGames].map((g) => ({
    ...g,
    auraPlaytime: auraPlaytime[String(g.id)] || 0,
  }));

  const genres = ["All", ...Array.from(new Set(allGames.map((g) => g.genre).filter(Boolean)))];

  const filteredGames = useMemo(() => {
    return allGames
      .filter((g) => {
        const genreOk = activeGenre === "All" || g.genre === activeGenre;
        const modeOk =
          activeMode === "all" ||
          (activeMode === "weekend" && g.playtime >= 40) ||
          (activeMode === "weekday" && g.playtime < 40);
        const searchOk =
          search === "" || g.title.toLowerCase().includes(search.toLowerCase());
        return genreOk && modeOk && searchOk;
      })
      .sort((a, b) => {
        if (!a.lastPlayed && !b.lastPlayed) return 0;
        if (!a.lastPlayed) return 1;
        if (!b.lastPlayed) return -1;
        return new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime();
      });
  }, [activeGenre, activeMode, allGames, search]);

  return (
    <div className="app">
      {!onboardingDone ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <>
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <Gamepad2 size={28} color="#a78bfa" />
              <span>Aura</span>
            </div>

            <nav className="sidebar-nav">
              <button
                className={`nav-item ${activePage === "library" ? "active" : ""}`}
                onClick={() => setActivePage("library")}
              >
                <Home size={18} />
                <span>Library</span>
              </button>
              <button
                className={`nav-item ${activePage === "stats" ? "active" : ""}`}
                onClick={() => setActivePage("stats")}
              >
                <BarChart2 size={18} />
                <span>Stats</span>
              </button>
              <button
                className={`nav-item ${activePage === "recent" ? "active" : ""}`}
                onClick={() => setActivePage("recent")}
              >
                <Clock size={18} />
                <span>Recent</span>
              </button>
              <button
                className={`nav-item ${activePage === "settings" ? "active" : ""}`}
                onClick={() => setActivePage("settings")}
              >
                <SettingsIcon size={18} />
                <span>Settings</span>
              </button>
            </nav>

            {/* Mode Switcher */}
            <div className="mode-switcher">
              <p className="mode-label">Mode</p>
              <button
                className={`mode-btn ${activeMode === "all" ? "active" : ""}`}
                onClick={() => setActiveMode("all")}
              >
                <Gamepad2 size={14} />
                All Games
              </button>
              <button
                className={`mode-btn ${activeMode === "weekday" ? "active" : ""}`}
                onClick={() => setActiveMode("weekday")}
              >
                <Sun size={14} />
                Weekday
              </button>
              <button
                className={`mode-btn ${activeMode === "weekend" ? "active" : ""}`}
                onClick={() => setActiveMode("weekend")}
              >
                <Moon size={14} />
                Weekend
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {activePage === "stats" ? (
              <Stats games={allGames} />
            ) : activePage === "recent" ? (
              <Recent />
            ) : activePage === "settings" ? (
              <Settings
                activeTheme={theme}
                onThemeChange={handleThemeChange}
                localFolders={localFolders}
                onAddFolder={(games) => {
                  setLocalGames((prev) => [...prev, ...games]);
                }}
                onRemoveFolder={(folder) => {
                  const newFolders = localFolders.filter((f) => f !== folder);
                  setLocalFolders(newFolders);
                  invoke("save_settings", { theme, localFolders: newFolders });
                }}
                onRescan={loadGames}
              />
            ) : (
              <>
                <div className="topbar">
                  <h1 className="page-title">My Library</h1>
                  <div className="topbar-right">
                    <button onClick={addLocalFolder} className="add-folder-btn">
                      <Gamepad2 size={16} />
                      Add Local Folder
                    </button>
                    <RandomPicker games={filteredGames} />
                    <div className="search-bar">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search games..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <p className="game-count">{filteredGames.length} games</p>
                  </div>
                </div>

                <OnThisDay games={allGames} />
                <MoodPicker games={allGames} />
                <Rediscover games={allGames} />

                <div className="genre-filter">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      className={`genre-btn ${activeGenre === genre ? "active" : ""}`}
                      onClick={() => setActiveGenre(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>

                <VirtualGrid>
                  {pinnedIds.length > 0 && (
                    <div className="pinned-section">
                      <p className="pinned-section-title">
                        <Pin size={11} /> Pinned
                      </p>
                      <div className="game-grid">
                        {filteredGames
                          .filter((g) => pinnedIds.includes(g.id))
                          .map((game) => (
                            <GameCard
                              key={game.id}
                              game={game}
                              isPinned={true}
                              onTogglePin={handleTogglePin}
                              onUninstall={handleUninstall}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                  <div className="game-grid">
                    {filteredGames
                      .filter((g) => !pinnedIds.includes(g.id))
                      .map((game) => (
                        <GameCard
                          key={game.id}
                          game={game}
                          isPinned={false}
                          onTogglePin={handleTogglePin}
                          onUninstall={handleUninstall}
                        />
                      ))}
                  </div>
                </VirtualGrid>
              </>
            )}
          </main>
        </>
      )}

      {updateInfo && (
        <UpdateModal
          version={updateInfo.version}
          notes={updateInfo.notes}
          onClose={() => setUpdateInfo(null)}
        />
      )}
    </div>
  );
}

export default App;