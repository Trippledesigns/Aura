use std::fs;

use serde::{Deserialize, Serialize};

use tauri::{Manager, Emitter};

use notify::{Watcher, RecursiveMode, recommended_watcher};

use std::sync::mpsc;

use std::time::Duration;

use winreg::enums::*;



fn get_steam_path() -> String {

    let hklm = winreg::RegKey::predef(HKEY_LOCAL_MACHINE);

    if let Ok(key) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam") {

        if let Ok(path) = key.get_value::<String, _>("InstallPath") {

            return format!("{}\\steamapps", path);

        }

    }

    // Fallback

    "C:\\Program Files (x86)\\Steam\\steamapps".to_string()

}



fn get_ubisoft_path() -> String {

    let hklm = winreg::RegKey::predef(HKEY_LOCAL_MACHINE);

    if let Ok(key) = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher") {

        if let Ok(path) = key.get_value::<String, _>("InstallDir") {

            return format!("{}\\games", path);

        }

    }

    // Fallback

    "C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games".to_string()

}



fn get_epic_manifests_path() -> String {

    // Epic always stores manifests in ProgramData regardless of install location

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

        None => {

            eprintln!("Failed to get IGDB token");

            return (String::new(), "Unknown".to_string());

        }

    };



    eprintln!("Got token, looking up: {}", name);



    match igdb_lookup(&name, &token).await {

        Some(result) => {

            eprintln!("Found metadata for: {}", name);

            result

        }

        None => {

            eprintln!("No metadata found for: {}", name);

            (String::new(), "Unknown".to_string())

        }

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



#[tauri::command]

fn scan_steam_games() -> Vec<ScannedGame> {

    let mut all_paths: Vec<String> = Vec::new();



    // Default Steam path from registry

    let default_path = get_steam_path();

    all_paths.push(default_path.clone());



    // Read libraryfolders.vdf to find additional library paths

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



            // Avoid duplicates

            if games.iter().any(|g: &ScannedGame| g.id == appid) {

                continue;

            }



            games.push(ScannedGame {

                id: appid.clone(),

                name,

                last_played,

                playtime: 0,

                cover,

                platform: "Steam".to_string(),

                launch_command: format!("steam://rungameid/{}", appid),

            });

        }

    }



    games

}



#[tauri::command]

fn scan_epic_games() -> Vec<ScannedGame> {

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

            catalog_item_id, name.replace(" ", "")

        );



        games.push(ScannedGame {

            id: app_name.clone(),

            name,

            last_played: 0,

            playtime: 0,

            cover,

            platform: "Epic".to_string(),

            launch_command: format!("com.epicgames.launcher://apps/{}?action=launch", app_name),

        });

    }



    games

}



// ─── Ubisoft ───────────────────────────────────────────────────────────



#[tauri::command]

fn scan_ubisoft_games() -> Vec<ScannedGame> {

    let mut games = Vec::new();

    let _games_path = get_ubisoft_path();



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

        });

    }



    games

}



#[tauri::command]

fn launch_game(launch_command: String) -> bool {

    use std::process::Command;



    // Handle different launch command types

    if launch_command.starts_with("steam://") 

        || launch_command.starts_with("com.epicgames")

        || launch_command.starts_with("uplay://") {

        // URI protocol launch

        Command::new("cmd")

            .args(["/C", "start", "", &launch_command])

            .spawn()

            .is_ok()

    } else {

        // Direct executable launch

        Command::new(&launch_command)

            .spawn()

            .is_ok()

    }

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

        

        // Check if it's a directory (each game usually has its own folder)

        if path.is_dir() {

            let game_name = path

                .file_name()

                .and_then(|n| n.to_str())

                .unwrap_or("")

                .to_string();



            if game_name.is_empty() {

                continue;

            }



            // Find the main exe inside the folder

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



            let launch_command = exe_path.unwrap_or_default();



            if launch_command.is_empty() {

                continue;

            }



            games.push(ScannedGame {

                id: format!("local_{}", game_name),

                name: game_name,

                last_played: 0,

                playtime: 0,

                cover: String::new(),

                platform: "Local".to_string(),

                launch_command,

            });

        }

    }



    games

}



// ─── Recent Games ───────────────────────────────────────────────────────



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



    // Remove if already exists

    recent.retain(|g| g["id"].as_str().unwrap_or("") != game_id);



    // Add to front

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



    // Keep last 20

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

        let (tx, rx) = mpsc::channel();



        let mut watcher = match recommended_watcher(move |res| {

            if let Ok(event) = res {

                tx.send(event).ok();

            }

        }) {

            Ok(w) => w,

            Err(_) => return,

        };



        // Watch Steam

        watcher.watch(

            std::path::Path::new(&get_steam_path()),

            RecursiveMode::NonRecursive,

        ).ok();



        // Watch Epic

        watcher.watch(

            std::path::Path::new(&get_epic_manifests_path()),

            RecursiveMode::NonRecursive,

        ).ok();



        // Watch Ubisoft

        watcher.watch(

            std::path::Path::new(&get_ubisoft_path()),

            RecursiveMode::NonRecursive,

        ).ok();



        loop {

            match rx.recv_timeout(Duration::from_secs(2)) {

                Ok(event) => {

                    // Debounce — only emit if it's a create or remove event

                    let kind = format!("{:?}", event.kind);

                    if kind.contains("Create") || kind.contains("Remove") {

                        app.emit("library-changed", ()).ok();

                    }

                }

                Err(_) => continue,

            }

        }

    });

}



// ─── Entry point ─────────────────────────────────────────────────────



pub fn run() {

    tauri::Builder::default()

        .plugin(tauri_plugin_opener::init())

        .plugin(tauri_plugin_dialog::init())

        .plugin(tauri_plugin_updater::Builder::new().build())

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



            let icon_bytes = include_bytes!("../icons/Square30x30Logo.png");

            let icon = tauri::image::Image::new_owned(icon_bytes.to_vec(), 30, 30);



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

                    } = event {

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

            enrich_game_metadata,

            launch_game,

            scan_local_folder,

            save_recent_game,

            get_recent_games,

            start_file_watcher

        ])

        .run(tauri::generate_context!())

        .expect("error while running tauri application");

}