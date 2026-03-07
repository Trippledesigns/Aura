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

import { open } from "@tauri-apps/plugin-dialog";

import { getCurrentWindow } from "@tauri-apps/api/window";

import "./App.css";



// Virtual scrolling component for performance

const VirtualGrid = ({ children }: { children: React.ReactNode }) => {

  return (

    <div style={{ height: '600px', overflow: 'auto' }}>

      {children}

    </div>

  );

};



const MOCK_GAMES: Game[] = [

  { id: 1, title: "Elden Ring", genre: "RPG", platform: "Steam", playtime: 87, hltb: 58, lastPlayed: "2024-01-10", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg" },

  { id: 2, title: "Hollow Knight", genre: "Platformer", platform: "Steam", playtime: 42, hltb: 25, lastPlayed: "2024-02-20", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg" },

  { id: 3, title: "Cyberpunk 2077", genre: "RPG", platform: "GOG", playtime: 120, hltb: 25, lastPlayed: "2023-12-05", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg" },

  { id: 4, title: "Hades", genre: "Roguelike", platform: "Epic", playtime: 60, hltb: 22, lastPlayed: "2024-03-01", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg" },

  { id: 5, title: "Stardew Valley", genre: "Simulation", platform: "Steam", playtime: 200, hltb: 53, lastPlayed: "2024-01-28", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg" },

  { id: 6, title: "Celeste", genre: "Platformer", platform: "Steam", playtime: 0, hltb: 8, lastPlayed: null, cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/504230/header.jpg" },

  { id: 7, title: "Deep Rock Galactic", genre: "Shooter", platform: "Steam", playtime: 95, hltb: 20, lastPlayed: "2024-02-14", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/548430/header.jpg" },

  { id: 8, title: "Disco Elysium", genre: "RPG", platform: "GOG", playtime: 5, hltb: 30, lastPlayed: "2023-08-22", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/632470/header.jpg" },

  { id: 9, title: "Vampire Survivors", genre: "Roguelike", platform: "Steam", playtime: 0, hltb: 7, lastPlayed: null, cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1794680/header.jpg" },

  { id: 10, title: "Baldur's Gate 3", genre: "RPG", platform: "Steam", playtime: 180, hltb: 100, lastPlayed: "2024-02-28", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg" },

  { id: 11, title: "Forza Horizon 5", genre: "Racing", platform: "Epic", playtime: 0, hltb: 16, lastPlayed: null, cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg" },

  { id: 12, title: "Into the Breach", genre: "Strategy", platform: "GOG", playtime: 4, hltb: 10, lastPlayed: "2023-07-18", cover: "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/590380/header.jpg" },

];



const GENRES = ["All", ...Array.from(new Set(MOCK_GAMES.map((g) => g.genre)))];



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

        const games = await invoke<Game[]>("scan_local_folder", { 

          folderPath: folder 

        });

        setLocalGames(games);

      } catch (err) {

        console.error("Local scan error:", err);

      }

    }

  };



  useEffect(() => {

    invoke<any>("load_settings").then((settings) => {

      if (settings.theme) setTheme(settings.theme);

      if (settings.local_folders) setLocalFolders(settings.local_folders);

    });

  }, []);


  // Toggle pin

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


  // Save settings when theme changes
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    invoke("save_settings", { 
      theme: newTheme, 
      localFolders: localFolders 
    });
  };



  useEffect(() => {

    document.documentElement.setAttribute("data-theme", theme);

  }, [theme]);



  useEffect(() => {

    let unlistenFn: (() => void) | null = null;

  

    const setup = async () => {

      const win = getCurrentWindow();

      console.log("Setting up close handler for window:", win);

      

      unlistenFn = await win.onCloseRequested((event) => {

        console.log("Close requested event:", event);

        event.preventDefault();

        console.log("Prevented close, hiding window");

        win.hide();

      });

    };

  

    setup();

  

    return () => {

      if (unlistenFn) {

        console.log("Cleaning up close handler");

        unlistenFn();

      }

    };

  }, []);



  const allGames = [...steamGames, ...localGames].length > 0 

    ? [...steamGames, ...localGames] 

    : [...MOCK_GAMES, ...localGames];



  const filteredGames = useMemo(() => {

    return allGames
      .filter((g) => {

        const genreOk = activeGenre === "All" || g.genre === activeGenre;

        const modeOk =

          activeMode === "all" ||

          (activeMode === "weekend" && g.playtime >= 40) ||

          (activeMode === "weekday" && g.playtime < 40);

        const searchOk = search === "" || g.title.toLowerCase().includes(search.toLowerCase());

        return genreOk && modeOk && searchOk;

      })
      .sort((a, b) => {
        // Never played goes to bottom
        if (!a.lastPlayed && !b.lastPlayed) return 0;
        if (!a.lastPlayed) return 1;
        if (!b.lastPlayed) return -1;
        // Most recently played first
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

                  {GENRES.map((genre) => (

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

                  {/* Pinned Games */}

                  {pinnedIds.length > 0 && (

                    <div className="pinned-section">

                      <p className="pinned-section-title">

                        <Pin size={11} /> Pinned

                      </p>

                      <div className="game-grid">

                        {filteredGames

                          .filter((g) => pinnedIds.indexOf(g.id) !== -1)

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

                  {/* All Games */}

                  <div className="game-grid">

                    {filteredGames

                      .filter((g) => pinnedIds.indexOf(g.id) === -1)

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