use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize, specta::Type)]
pub struct InstalledApplication {
    pub name: String,
    pub path: String,
}

#[cfg(not(windows))]
fn collect_applications(root: &Path, depth: usize, apps: &mut Vec<InstalledApplication>) {
    let Ok(entries) = std::fs::read_dir(root) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "app") && path.is_dir() {
            if let (Some(name), Some(value)) = (path.file_stem().and_then(|name| name.to_str()), path.to_str()) {
                apps.push(InstalledApplication {
                    name: name.to_owned(),
                    path: value.to_owned(),
                });
            }
        } else if depth > 0 && entry.file_type().is_ok_and(|kind| kind.is_dir()) {
            collect_applications(&path, depth - 1, apps);
        }
    }
}

#[cfg(not(windows))]
fn find_applications() -> Vec<InstalledApplication> {
    let mut roots = vec![PathBuf::from("/Applications"), PathBuf::from("/System/Applications")];
    if let Some(home) = ::dirs::home_dir() {
        roots.push(home.join("Applications"));
    }
    let mut apps = Vec::new();
    for root in roots {
        collect_applications(&root, 2, &mut apps);
    }
    apps
}

/// Windows has no application folder, so installed programs are found through their Start menu and desktop shortcuts.
#[cfg(windows)]
const SHORTCUT_SCRIPT: &str = r#"[Console]::OutputEncoding=[Text.Encoding]::UTF8
$shell=New-Object -ComObject WScript.Shell
$folders=@('CommonPrograms','Programs','CommonDesktopDirectory','Desktop')|ForEach-Object{[Environment]::GetFolderPath($_)}|Where-Object{$_}
$items=@(Get-ChildItem -LiteralPath $folders -Recurse -Filter *.lnk -ErrorAction SilentlyContinue|ForEach-Object{
try{$link=$shell.CreateShortcut($_.FullName);[pscustomobject]@{name=$_.BaseName;path=$link.TargetPath;args=$link.Arguments}}catch{}})
ConvertTo-Json -InputObject $items -Compress"#;

#[cfg(windows)]
#[derive(serde::Deserialize)]
struct Shortcut {
    name: String,
    path: Option<String>,
    args: Option<String>,
}

/// Squirrel installers (Discord and similar) point shortcuts at Update.exe and name the real program in arguments.
#[cfg(windows)]
fn squirrel_program(args: &str) -> Option<String> {
    let rest = args.split("--processStart").nth(1)?.trim_start();
    let name = match rest.strip_prefix('"') {
        Some(quoted) => quoted.split('"').next()?,
        None => rest.split_whitespace().next()?,
    };
    name.to_ascii_lowercase().ends_with(".exe").then(|| name.to_owned())
}

#[cfg(windows)]
fn find_applications() -> Vec<InstalledApplication> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let Ok(output) = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", SHORTCUT_SCRIPT])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    else {
        return Vec::new();
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let shortcuts: Vec<Shortcut> = serde_json::from_str(text.trim_start_matches('\u{feff}').trim()).unwrap_or_default();
    shortcuts
        .into_iter()
        .filter_map(|item| {
            let target = PathBuf::from(item.path?);
            let file = target.file_name()?.to_str()?.to_ascii_lowercase();
            let lower = item.name.to_lowercase();
            // Advertised MSI shortcuts point at icon stubs in the Installer cache, not at the program.
            if !file.ends_with(".exe")
                || target.to_str()?.to_lowercase().contains("\\windows\\installer\\")
                || ["uninstall", "удалить", "удаление", "deinstall"]
                    .iter()
                    .any(|word| lower.contains(word) || file.contains(word))
            {
                return None;
            }
            let path = match (file.as_str(), item.args.as_deref().and_then(squirrel_program)) {
                ("update.exe", Some(program)) => target.parent()?.join(program),
                _ if target.is_file() => target,
                _ => return None,
            };
            Some(InstalledApplication {
                name: item.name,
                path: path.to_str()?.to_owned(),
            })
        })
        .collect()
}

#[tauri::command]
#[specta::specta]
pub async fn list_installed_apps() -> Vec<InstalledApplication> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut apps = find_applications();
        apps.sort_by_cached_key(|app| (app.name.to_lowercase(), app.path.to_lowercase()));
        apps.dedup_by(|a, b| a.path.eq_ignore_ascii_case(&b.path));
        apps
    })
    .await
    .unwrap_or_default()
}

#[derive(serde::Deserialize, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum RemoteApplication {
    Tailscale,
    Windows,
}

#[tauri::command]
#[specta::specta]
pub async fn open_remote_application(app: tauri::AppHandle, application: RemoteApplication) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let name = match application {
        RemoteApplication::Tailscale => "Tailscale",
        RemoteApplication::Windows => "Windows App",
    };
    let applications = list_installed_apps().await;
    let target = applications
        .into_iter()
        .find(|item| item.name == name)
        .ok_or_else(|| "Application is not installed".to_owned())?;
    app.opener()
        .open_path(target.path, None::<&str>)
        .map_err(|_| "Could not open the application".to_owned())
}

/// Tailscale's resolver forwards lookups outside the tunnel, so site names leak even though traffic is routed.
fn default_resolver_uses_tailscale(scutil: &str) -> bool {
    // Only the first unscoped resolver answers ordinary lookups; per-domain entries such as ts.net are expected.
    let general = scutil
        .split("DNS configuration (for scoped queries)")
        .next()
        .unwrap_or_default();
    general
        .split("resolver #")
        .skip(1)
        .find(|block| !block.lines().any(|line| line.trim_start().starts_with("domain")))
        .is_some_and(|block| {
            block.lines().any(|line| {
                let line = line.trim();
                line.starts_with("nameserver[")
                    && (line.ends_with(": 100.100.100.100") || line.ends_with(": fd7a:115c:a1e0::53"))
            })
        })
}

#[tauri::command]
#[specta::specta]
pub async fn tailscale_takes_dns() -> bool {
    tauri::async_runtime::spawn_blocking(|| {
        std::process::Command::new("/usr/sbin/scutil")
            .arg("--dns")
            .output()
            .ok()
            .and_then(|output| String::from_utf8(output.stdout).ok())
            .is_some_and(|text| default_resolver_uses_tailscale(&text))
    })
    .await
    .unwrap_or(false)
}

#[tauri::command]
#[specta::specta]
pub async fn stop_tailscale_dns() -> Result<(), String> {
    let tailscale = list_installed_apps()
        .await
        .into_iter()
        .find(|item| item.name == "Tailscale")
        .ok_or_else(|| "Tailscale is not installed".to_owned())?;
    let cli = Path::new(&tailscale.path).join("Contents/MacOS/Tailscale");
    let status = tauri::async_runtime::spawn_blocking(move || {
        std::process::Command::new(cli)
            .args(["set", "--accept-dns=false"])
            .status()
    })
    .await
    .map_err(|_| "Could not run Tailscale".to_owned())?
    .map_err(|_| "Could not run Tailscale".to_owned())?;
    if status.success() {
        Ok(())
    } else {
        Err("Tailscale refused the change".to_owned())
    }
}
