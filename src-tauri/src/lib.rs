use std::fs;
use std::collections::HashMap;
use std::sync::mpsc;
use std::time::{Duration, SystemTime};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use notify::{Watcher, RecursiveMode, recommended_watcher};
use winreg::enums::*;

mod performance;

fn get_steam_path() -> String {
    let hklm = winreg::RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam") {
        if let Ok(path) = key.get_value::<String, _>("InstallPath") {
            return format!("{}\\steamapps", path);
        }
    }
    "C:\\Program Files (x86)\\Steam\\steamapps".to_string()
}

fn get_ubisoft_path() -> String {
    let hklm = winreg::RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher") {
        if let Ok(path) = key.get_value::<String, _>("InstallDir") {
            return format!("{}\\games", path);
        }
    }
    "C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games".to_string()
}

fn get_epic_manifests_path() -> String {
    let program_data = std::env::var("PROGRAMDATA")
        .unwrap_or_else(|_| "C:\\ProgramData".to_string());
    format!("{}\\Epic\\EpicGamesLauncher\\Data\\Manifests", program_data)
}

const TWITCH_CLIENT_ID: &str = "ttqwkixs8nfdg3tb1ltut0zbk1alps";
const TWITCH_CLIENT_SECRET: &str = "fxs4i3p4keg76f6xbvnjlwlt9r4ojh";

async fn get_igdb_token() -> Option<String> {
    let client = reqwest::Client::new();
    let res = client
        .post("https://id.twitch.tv/oauth2/token")
        .query(&[
            ("client_id", TWITCH_CLIENT_ID),
            ("client_secret", TWITCH_CLIENT_SECRET),
            ("grant_type", "client_credentials"),
        ])
        .send()
        .await
        .ok()?;
    let json: serde_json::Value = res.json().await.ok()?;
    json["access_token"].as_str().map(|s| s.to_string())
}

async fn igdb_lookup(name: &str, token: &str) -> Option<(String, String)> {
    let client = reqwest::Client::new();
    let body = format!(
        "search \"{}\"; fields name,cover.url,genres.name; limit 1;",
        name.replace("\"", "")
    );
    let res = client
        .post("https://api.igdb.com/v4/games")
        .header("Client-ID", TWITCH_CLIENT_ID)
        .header("Authorization", format!("Bearer {}", token))
        .body(body)
        .send()
        .await
        .ok()?;
    let json: serde_json::Value = res.json().await.ok()?;
    let games = json.as_array()?;
    if games.is_empty() {
        return None;
    }
    let game = &games[0];
    let cover = game["cover"]["url"]
        .as_str()
        .map(|u| u.replace("//", "https://").replace("t_thumb", "t_cover_big"))
        .unwrap_or_default();
    let genre = game["genres"]
        .as_array()
        .and_then(|g| g.first())
        .and_then(|g| g["name"].as_str())
        .unwrap_or("Unknown")
        .to_string();
    Some((cover, genre))
}

#[tauri::command]
async fn enrich_game_metadata(name: String) -> (String, String) {
    let token = match get_igdb_token().await {
        Some(t) => t,
        None => return (String::new(), "Unknown".to_string()),
    };
    match igdb_lookup(&name, &token).await {
        Some(result) => result,
        None => (String::new(), "Unknown".to_string()),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScannedGame {
    pub id: String,
    pub name: String,
    pub last_played: u64,
    pub playtime: u64,
    pub cover: String,
    pub platform: String,
    pub launch_command: String,
    pub process_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GameCache {
    games: Vec<ScannedGame>,
    timestamp: u64,
    platform: String,
}

impl GameCache {
    fn is_expired(&self) -> bool {
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        // Cache expires after 1 hour
        now.saturating_sub(self.timestamp) > 3600
    }
}

fn load_cache(platform: &str) -> Option<GameCache> {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("cache")
        .join(format!("games_{}.json", platform));
    
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(cache) = serde_json::from_str::<GameCache>(&content) {
            if !cache.is_expired() {
                return Some(cache);
            }
        }
    }
    None
}

fn save_cache(platform: &str, games: &[ScannedGame]) {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("cache");
    
    fs::create_dir_all(&path).ok();
    
    let cache = GameCache {
        games: games.to_vec(),
        timestamp: SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        platform: platform.to_string(),
    };
    
    let cache_path = path.join(format!("games_{}.json", platform));
    fs::write(&cache_path, serde_json::to_string_pretty(&cache).unwrap_or_default()).ok();
}

fn parse_acf_value(content: &str, key: &str) -> Option<String> {
    let search = format!("\"{}\"", key);
    let line = content.lines().find(|l| l.trim().starts_with(&search))?;
    let trimmed = line.trim();
    let last_quote_start = trimmed.rfind('"')?;
    let second_last_quote = trimmed[..last_quote_start].rfind('"')?;
    Some(trimmed[second_last_quote + 1..last_quote_start].to_string())
}

fn is_real_game(name: &str) -> bool {
    let filters = [
        "redistributable", "redist", "steamworks",
        "directx", "vcredist", "openal", "physx",
        "sdk", "server",
    ];
    let lower = name.to_lowercase();
    !filters.iter().any(|f| lower.contains(f))
}

fn find_game_executable(steamapps_path: &str, appid: &str) -> String {
    // First, try to find the game's installation folder from the ACF file
    let acf_path = format!("{}\\appmanifest_{}.acf", steamapps_path, appid);
    if let Ok(content) = fs::read_to_string(&acf_path) {
        if let Some(install_dir) = parse_acf_value(&content, "installdir") {
            // Look in common Steam library locations for this game
            let library_paths = vec![
                format!("{}\\..\\common\\{}", steamapps_path, install_dir),
                format!("C:\\Program Files (x86)\\Steam\\steamapps\\common\\{}", install_dir),
            ];
            
            for path in library_paths {
                if let Ok(entries) = fs::read_dir(&path) {
                    for entry in entries.flatten() {
                        let file_path = entry.path();
                        if let Some(extension) = file_path.extension() {
                            if extension == "exe" {
                                if let Some(name) = file_path.file_name() {
                                    return name.to_string_lossy().to_string();
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    String::new()
}

#[tauri::command]
fn scan_steam_games() -> Vec<ScannedGame> {
    // Check cache first
    if let Some(cache) = load_cache("steam") {
        return cache.games;
    }

    let mut all_paths: Vec<String> = Vec::new();
    let default_path = get_steam_path();
    all_paths.push(default_path.clone());

    let vdf_path = format!("{}\\libraryfolders.vdf", default_path);
    if let Ok(content) = fs::read_to_string(vdf_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("\"path\"") {
                let parts: Vec<&str> = trimmed.split('"').collect();
                if parts.len() >= 4 {
                    let path = parts[3].replace("\\\\", "\\");
                    let steamapps = format!("{}\\steamapps", path);
                    if !all_paths.contains(&steamapps) {
                        all_paths.push(steamapps);
                    }
                }
            }
        }
    }

    let mut games = Vec::new();

    for steamapps_path in &all_paths {
        let entries = match fs::read_dir(steamapps_path) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let filename = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");

            if !filename.starts_with("appmanifest_") || !filename.ends_with(".acf") {
                continue;
            }

            let content = match fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let name = match parse_acf_value(&content, "name") {
                Some(n) => n,
                None => continue,
            };

            if !is_real_game(&name) {
                continue;
            }

            let appid = parse_acf_value(&content, "appid").unwrap_or_default();
            let last_played = parse_acf_value(&content, "LastPlayed")
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(0);

            let cover = format!(
                "https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{}/header.jpg",
                appid
            );

            if games.iter().any(|g: &ScannedGame| g.id == appid) {
                continue;
            }

            // Extract exe name for process tracking
            let exe = parse_acf_value(&content, "LauncherPath")
                .or_else(|| parse_acf_value(&content, "exe"))
                .unwrap_or_default();

            // If ACF parsing failed, try to find the executable in the game folder
            let process_name = if exe.is_empty() {
                find_game_executable(steamapps_path, &appid)
            } else {
                std::path::Path::new(&exe)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string()
            };

            games.push(ScannedGame {
                id: appid.clone(),
                name,
                last_played,
                playtime: 0,
                cover,
                platform: "Steam".to_string(),
                launch_command: format!("steam://rungameid/{}", appid),
                process_name,
            });
        }
    }

    // Save to cache
    save_cache("steam", &games);
    games
}

#[tauri::command]
fn scan_epic_games() -> Vec<ScannedGame> {
    // Check cache first
    if let Some(cache) = load_cache("epic") {
        return cache.games;
    }

    let manifests_path = get_epic_manifests_path();
    let mut games = Vec::new();

    let entries = match fs::read_dir(manifests_path) {
        Ok(e) => e,
        Err(_) => return games,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let filename = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        if !filename.ends_with(".item") {
            continue;
        }

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let json: serde_json::Value = match serde_json::from_str(&content) {
            Ok(j) => j,
            Err(_) => continue,
        };

        let is_app = json["bIsApplication"].as_bool().unwrap_or(false);
        if !is_app {
            continue;
        }

        let name = match json["DisplayName"].as_str() {
            Some(n) => n.to_string(),
            None => continue,
        };

        let app_name = json["AppName"].as_str().unwrap_or("").to_string();
        let catalog_item_id = json["CatalogItemId"].as_str().unwrap_or("").to_string();

        let cover = format!(
            "https://cdn1.epicgames.com/offer/image/{}/EGS_{}_Thumbnail_284x284-284x284-offer-0-284x284.jpg",
            catalog_item_id,
            name.replace(" ", "")
        );

        games.push(ScannedGame {
            id: app_name.clone(),
            name,
            last_played: 0,
            playtime: 0,
            cover,
            platform: "Epic".to_string(),
            launch_command: format!("com.epicgames.launcher://apps/{}?action=launch", app_name),
            process_name: String::new(),
        });
    }

    // Save to cache
    save_cache("epic", &games);
    games
}

#[tauri::command]
fn scan_ubisoft_games() -> Vec<ScannedGame> {
    // Check cache first
    if let Some(cache) = load_cache("ubisoft") {
        return cache.games;
    }

    let mut games = Vec::new();

    let hklm = winreg::RegKey::predef(HKEY_LOCAL_MACHINE);
    let installs = match hklm.open_subkey("SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs") {
        Ok(k) => k,
        Err(_) => return games,
    };

    for subkey_name in installs.enum_keys().flatten() {
        let subkey = match installs.open_subkey(&subkey_name) {
            Ok(k) => k,
            Err(_) => continue,
        };

        let install_dir: String = match subkey.get_value("InstallDir") {
            Ok(v) => v,
            Err(_) => continue,
        };

        let name = {
            let trimmed = install_dir.trim_end_matches('/').trim_end_matches('\\');
            std::path::Path::new(trimmed)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(&subkey_name)
                .to_string()
        };

        let cover = format!(
            "https://ubistatic-a.akamaihd.net/0058/prod/assets/{}/default-content/default-image_460x215.jpg",
            subkey_name
        );

        games.push(ScannedGame {
            id: subkey_name.clone(),
            name,
            last_played: 0,
            playtime: 0,
            cover,
            platform: "Ubisoft".to_string(),
            launch_command: format!("uplay://launch/{}/0", subkey_name),
            process_name: String::new(),
        });
    }

    // Save to cache
    save_cache("ubisoft", &games);
    games
}

#[tauri::command]
fn scan_gog_games() -> Vec<ScannedGame> {
    // Check cache first
    if let Some(cache) = load_cache("gog") {
        return cache.games;
    }

    let mut games = Vec::new();

    let hklm = winreg::RegKey::predef(HKEY_LOCAL_MACHINE);
    let gog_games = match hklm.open_subkey("SOFTWARE\\WOW6432Node\\GOG.com\\Games") {
        Ok(k) => k,
        Err(_) => return games,
    };

    for subkey_name in gog_games.enum_keys().flatten() {
        let subkey = match gog_games.open_subkey(&subkey_name) {
            Ok(k) => k,
            Err(_) => continue,
        };

        let name: String = match subkey.get_value("gameName") {
            Ok(v) => v,
            Err(_) => continue,
        };

        let launch_command: String = subkey
            .get_value("launchCommand")
            .unwrap_or_else(|_| format!("goggalaxy://openGame/{}", subkey_name));

        let last_played: u64 = subkey
            .get_value("lastPlayedDate")
            .unwrap_or_else(|_| "0".to_string())
            .parse()
            .unwrap_or(0);

        let cover = "https://images.gog-statics.com/5643a7c831df452d29005caeca24c28cdbfaa6fbeff6620bf2a7016b6fe19402_product_card_v2_mobile_slider_639.jpg".to_string();

        games.push(ScannedGame {
            id: subkey_name.clone(),
            name,
            last_played,
            playtime: 0,
            cover,
            platform: "GOG".to_string(),
            launch_command,
            process_name: String::new(),
        });
    }

    games
}

#[tauri::command]
fn scan_local_folder(folder_path: String) -> Vec<ScannedGame> {
    let mut games = Vec::new();

    let entries = match fs::read_dir(&folder_path) {
        Ok(e) => e,
        Err(_) => return games,
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() {
            let game_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            if game_name.is_empty() {
                continue;
            }

            let exe_path = fs::read_dir(&path)
                .ok()
                .and_then(|entries| {
                    entries
                        .flatten()
                        .find(|e| {
                            e.path().extension()
                                .and_then(|ext| ext.to_str())
                                .map(|ext| ext == "exe")
                                .unwrap_or(false)
                        })
                        .map(|e| e.path().to_string_lossy().to_string())
                });

            let launch_command = match exe_path {
                Some(p) => p,
                None => continue,
            };

            let process_name = std::path::Path::new(&launch_command)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("")
                .to_string();

            games.push(ScannedGame {
                id: game_name.clone(),
                name: game_name,
                last_played: 0,
                playtime: 0,
                cover: String::new(),
                platform: "Local".to_string(),
                launch_command,
                process_name,
            });
        }
    }

    games
}

#[tauri::command]
fn launch_game(launch_command: String) -> bool {
    use std::process::Command;
    if launch_command.starts_with("steam://")
        || launch_command.starts_with("com.epicgames")
        || launch_command.starts_with("uplay://")
        || launch_command.starts_with("goggalaxy://")
    {
        Command::new("cmd")
            .args(["/C", "start", "", &launch_command])
            .spawn()
            .is_ok()
    } else {
        Command::new(&launch_command).spawn().is_ok()
    }
}

fn load_aura_playtime() -> HashMap<String, u64> {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("playtime.json");
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default()
}

fn save_aura_playtime(playtime: &HashMap<String, u64>) {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("playtime.json");
    std::fs::create_dir_all(path.parent().unwrap()).ok();
    std::fs::write(&path, serde_json::to_string_pretty(playtime).unwrap_or_default()).ok();
}

#[tauri::command]
fn get_aura_playtime() -> HashMap<String, u64> {
    load_aura_playtime()
}

fn is_process_running(process_name: &str) -> bool {
    use std::process::Command;
    if process_name.is_empty() {
        return false;
    }
    let output = Command::new("tasklist")
        .args(["/FI", &format!("IMAGENAME eq {}", process_name)])
        .output();
    match output {
        Ok(out) => String::from_utf8_lossy(&out.stdout).contains(process_name),
        Err(_) => false,
    }
}

fn is_steam_game_running(_game_id: &str) -> bool {
    use std::process::Command;
    
    // First check if Steam itself is running
    let steam_output = Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq steam.exe"])
        .output();
    
    let steam_running = match steam_output {
        Ok(out) => String::from_utf8_lossy(&out.stdout).contains("steam.exe"),
        Err(_) => false,
    };
    
    if !steam_running {
        return false;
    }
    
    // For Steam games, we'll use a simpler approach: check if any game process is running
    // This is a workaround since we can't easily track specific Steam game processes
    // We'll track for a reasonable time period (e.g., 5 minutes minimum) before considering it "played"
    true
}

#[tauri::command]
fn launch_and_track(
    app: tauri::AppHandle,
    game_id: String,
    launch_command: String,
    process_name: String,
) -> bool {
    use std::process::Command;

    let launched = if launch_command.starts_with("steam://")
        || launch_command.starts_with("com.epicgames")
        || launch_command.starts_with("uplay://")
        || launch_command.starts_with("goggalaxy://")
    {
        Command::new("cmd")
            .args(["/C", "start", "", &launch_command])
            .spawn()
            .is_ok()
    } else {
        Command::new(&launch_command).spawn().is_ok()
    };

    if !launched {
        return false;
    }

    let start_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    std::thread::spawn(move || {
        // Check if this is a Steam game
        let is_steam_game = launch_command.starts_with("steam://");
        
        // Wait for process to appear (up to 60 seconds)
        let mut process_found = false;
        for _ in 0..60 {
            std::thread::sleep(Duration::from_secs(1));
            if is_steam_game {
                if is_steam_game_running(&game_id) {
                    process_found = true;
                    break;
                }
            } else if is_process_running(&process_name) {
                process_found = true;
                break;
            }
        }

        if !process_found {
            return;
        }

        // Wait for process to exit
        if is_steam_game {
            // For Steam games, wait for Steam to no longer have the game running
            // We'll use a simple timeout approach since we can't easily detect specific game processes
            // Track for at least 5 minutes to count as "played"
            std::thread::sleep(Duration::from_secs(300));
        } else {
            // For non-Steam games, wait for the specific process to exit
            loop {
                std::thread::sleep(Duration::from_secs(5));
                if !is_process_running(&process_name) {
                    break;
                }
            }
        }

        let end_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let session_minutes = (end_time - start_time) / 60;
        if session_minutes < 1 {
            return;
        }

        let mut playtime = load_aura_playtime();
        let current = playtime.get(&game_id).copied().unwrap_or(0);
        playtime.insert(game_id.clone(), current + session_minutes);
        save_aura_playtime(&playtime);

        app.emit("playtime-updated", game_id).ok();
    });

    true
}

#[tauri::command]
fn save_recent_game(game_id: String, game_name: String, platform: String, cover: String) -> bool {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("recent.json");

    std::fs::create_dir_all(path.parent().unwrap()).ok();

    let mut recent: Vec<serde_json::Value> = std::fs::read_to_string(&path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default();

    recent.retain(|g| g["id"].as_str().unwrap_or("") != game_id);

    recent.insert(0, serde_json::json!({
        "id": game_id,
        "name": game_name,
        "platform": platform,
        "cover": cover,
        "played_at": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }));

    recent.truncate(20);

    std::fs::write(&path, serde_json::to_string_pretty(&recent).unwrap_or_default()).is_ok()
}

#[tauri::command]
fn get_recent_games() -> Vec<serde_json::Value> {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("recent.json");
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default()
}

#[tauri::command]
fn start_file_watcher(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let (tx, rx) = mpsc::channel::<notify::Result<notify::Event>>();

        let mut watcher = match recommended_watcher(move |res: notify::Result<notify::Event>| {
            if let Ok(event) = res {
                tx.send(Ok(event)).ok();
            }
        }) {
            Ok(w) => w,
            Err(_) => return,
        };

        watcher.watch(std::path::Path::new(&get_steam_path()), RecursiveMode::NonRecursive).ok();
        watcher.watch(std::path::Path::new(&get_epic_manifests_path()), RecursiveMode::NonRecursive).ok();
        watcher.watch(std::path::Path::new(&get_ubisoft_path()), RecursiveMode::NonRecursive).ok();

        loop {
            match rx.recv_timeout(Duration::from_secs(2)) {
                Ok(Ok(event)) => {
                    let kind = format!("{:?}", event.kind);
                    if kind.contains("Create") || kind.contains("Remove") {
                        // Smart cache invalidation - clear only the affected platform's cache
                        for path in &event.paths {
                            let path_str: std::borrow::Cow<str> = path.to_string_lossy();
                            
                            if path_str.contains("steamapps") {
                                performance::clear_platform_cache("steam");
                            } else if path_str.contains("Epic") || path_str.contains("Manifests") {
                                performance::clear_platform_cache("epic");
                            } else if path_str.contains("Ubisoft") || path_str.contains("Launcher") {
                                performance::clear_platform_cache("ubisoft");
                            } else if path_str.contains("GOG") {
                                performance::clear_platform_cache("gog");
                            }
                        }
                        
                        app.emit("library-changed", ()).ok();
                    }
                }
                Ok(Err(_)) | Err(_) => continue,
            }
        }
    });
}

#[tauri::command]
fn save_pinned_games(game_ids: Vec<String>) -> bool {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("pinned.json");
    std::fs::create_dir_all(path.parent().unwrap()).ok();
    std::fs::write(&path, serde_json::to_string_pretty(&game_ids).unwrap_or_default()).is_ok()
}

#[tauri::command]
fn get_pinned_games() -> Vec<String> {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("pinned.json");
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default()
}

#[tauri::command]
fn save_settings(theme: String, local_folders: Vec<String>) -> bool {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("settings.json");
    std::fs::create_dir_all(path.parent().unwrap()).ok();
    let settings = serde_json::json!({
        "theme": theme,
        "local_folders": local_folders
    });
    std::fs::write(&path, serde_json::to_string_pretty(&settings).unwrap_or_default()).is_ok()
}

#[tauri::command]
fn load_settings() -> serde_json::Value {
    let path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("settings.json");
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or(serde_json::json!({
            "theme": "midnight",
            "local_folders": []
        }))
}

#[tauri::command]
fn uninstall_game(platform: String, game_id: String, _launch_command: String) -> bool {
    use std::process::Command;

    match platform.as_str() {
        "Steam" => {
            Command::new("cmd")
                .args(["/C", "start", "", &format!("steam://uninstall/{}", game_id)])
                .spawn()
                .is_ok()
        }
        "Epic" => {
            Command::new("cmd")
                .args(["/C", "start", "", &format!("com.epicgames.launcher://apps/{}?action=uninstall", game_id)])
                .spawn()
                .is_ok()
        }
        "Ubisoft" => {
            Command::new("cmd")
                .args(["/C", "start", "", &format!("uplay://uninstall/{}", game_id)])
                .spawn()
                .is_ok()
        }
        "GOG" => {
            let hklm = winreg::RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE);
            if let Ok(key) = hklm.open_subkey(format!(
                "SOFTWARE\\WOW6432Node\\GOG.com\\Games\\{}", game_id
            )) {
                if let Ok(uninstall) = key.get_value::<String, _>("uninstallCommand") {
                    Command::new("cmd")
                        .args(["/C", &uninstall])
                        .spawn()
                        .ok();
                    return true;
                }
            }
            false
        }
        _ => false,
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let tray_menu = tauri::menu::MenuBuilder::new(app)
                .item(&tauri::menu::MenuItemBuilder::new("Open Aura")
                    .id("open")
                    .build(app)?)
                .separator()
                .item(&tauri::menu::MenuItemBuilder::new("Quit")
                    .id("quit")
                    .build(app)?)
                .build()?;

            let icon_bytes = include_bytes!("../icons/icon-48x48.png");
            let icon = tauri::image::Image::new_owned(icon_bytes.to_vec(), 48, 48);

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(icon)
                .menu(&tray_menu)
                .tooltip("Aura")
                .on_menu_event(|app: &tauri::AppHandle, event| match event.id().as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().ok();
                            window.set_focus().ok();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_steam_games,
            scan_epic_games,
            scan_ubisoft_games,
            scan_gog_games,
            enrich_game_metadata,
            launch_game,
            launch_and_track,
            scan_local_folder,
            save_recent_game,
            get_recent_games,
            get_aura_playtime,
            start_file_watcher,
            save_pinned_games,
            get_pinned_games,
            save_settings,
            load_settings,
            uninstall_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}