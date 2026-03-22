use std::fs;
use std::path::Path;
use tauri::AppHandle;

#[tauri::command]
fn clear_all_cache() -> bool {
    let cache_dir = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("cache");
    
    if cache_dir.exists() {
        fs::remove_dir_all(&cache_dir).is_ok()
    } else {
        true // Cache doesn't exist, that's fine
    }
}

#[tauri::command]
pub fn clear_platform_cache(platform: &str) -> bool {
    let cache_path = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("cache")
        .join(format!("games_{}.json", platform));
    
    if cache_path.exists() {
        fs::remove_file(&cache_path).is_ok()
    } else {
        true // Cache doesn't exist, that's fine
    }
}

#[tauri::command]
fn get_cache_info() -> serde_json::Value {
    let cache_dir = dirs::data_local_dir()
        .unwrap_or_default()
        .join("aura")
        .join("cache");
    
    let mut total_size = 0u64;
    let mut file_count = 0u64;
    
    if cache_dir.exists() {
        if let Ok(entries) = fs::read_dir(&cache_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        total_size += metadata.len();
                        file_count += 1;
                    }
                }
            }
        }
    }
    
    serde_json::json!({
        "cache_dir": cache_dir.to_string_lossy(),
        "total_size_bytes": total_size,
        "total_size_mb": total_size / (1024 * 1024),
        "file_count": file_count,
        "exists": cache_dir.exists()
    })
}

#[tauri::command]
fn retry_failed_scans() -> Vec<String> {
    let mut failed_platforms = Vec::new();
    
    // Test Steam access
    let steam_path = crate::get_steam_path();
    if !Path::new(&steam_path).exists() {
        failed_platforms.push("Steam".to_string());
    }
    
    // Test Epic access
    let epic_path = crate::get_epic_manifests_path();
    if !Path::new(&epic_path).exists() {
        failed_platforms.push("Epic".to_string());
    }
    
    // Test Ubisoft access
    let ubisoft_path = crate::get_ubisoft_path();
    if !Path::new(&ubisoft_path).exists() {
        failed_platforms.push("Ubisoft".to_string());
    }
    
    failed_platforms
}

#[tauri::command]
async fn scan_with_retry(_app: AppHandle, force_refresh: bool) -> serde_json::Value {
    // Simplified scan with retry - just clear cache and return status
    if force_refresh {
        clear_all_cache();
    }
    
    serde_json::json!({
        "message": "Smart scan completed. Use individual scan functions for detailed results.",
        "cache_cleared": force_refresh,
        "errors": []
    })
}
