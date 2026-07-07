mod adapters;
mod commands;
mod db;
mod utils;

use commands::skills::{
    detect_tools, list_skills, scan_skills, search_skills, toggle_skill, uninstall_skill,
    DbState,
};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Init DB
            let conn = db::open().expect("Failed to open database");
            app.manage(DbState(Mutex::new(conn)));

            // System tray
            let toggle = MenuItem::with_id(app, "toggle", "显示/隐藏", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &quit])?;

            let _tray = TrayIconBuilder::with_id("main")
                .tooltip("SkillHub")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = if win.is_visible().unwrap_or(false) {
                                win.hide()
                            } else {
                                win.show().and_then(|_| win.set_focus())
                            };
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_skills,
            list_skills,
            search_skills,
            toggle_skill,
            uninstall_skill,
            detect_tools,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
