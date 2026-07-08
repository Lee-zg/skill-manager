mod adapters;
mod commands;
mod db;
mod installer;
mod utils;

use commands::skills::{
    detect_tools, list_skills, scan_skills, search_skills, toggle_skill, uninstall_skill,
    DbState,
};
use commands::metadata::{
    list_categories_cmd, create_category_cmd, update_category_cmd, delete_category_cmd,
    set_skill_category_cmd, remove_skill_category_cmd,
    add_tag_cmd, remove_tag_cmd, list_all_tags_cmd,
    upsert_note_cmd,
    add_alias_cmd, remove_alias_cmd, rename_skill_cmd,
};
use commands::workspaces::{
    list_workspaces_cmd, create_workspace_cmd, update_workspace_cmd,
    delete_workspace_cmd, activate_workspace_cmd,
    list_workspace_skills_cmd, add_skill_to_workspace_cmd, remove_skill_from_workspace_cmd,
    export_workspace_yaml, import_workspace_yaml,
};
use commands::repositories::{
    list_repositories_cmd, add_repository_cmd, toggle_repository_cmd, delete_repository_cmd,
    search_registry_cmd, install_skill_cmd, update_skill_cmd, check_updates_cmd,
};
use commands::settings::{
    get_settings, update_settings, get_tool_paths, get_app_stats,
    AppSettings, SettingsState,
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

            // Init Settings
            app.manage(SettingsState(Mutex::new(AppSettings::default())));

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
            list_categories_cmd,
            create_category_cmd,
            update_category_cmd,
            delete_category_cmd,
            set_skill_category_cmd,
            remove_skill_category_cmd,
            add_tag_cmd,
            remove_tag_cmd,
            list_all_tags_cmd,
            upsert_note_cmd,
            add_alias_cmd,
            remove_alias_cmd,
            rename_skill_cmd,
            list_workspaces_cmd,
            create_workspace_cmd,
            update_workspace_cmd,
            delete_workspace_cmd,
            activate_workspace_cmd,
            list_workspace_skills_cmd,
            add_skill_to_workspace_cmd,
            remove_skill_from_workspace_cmd,
            export_workspace_yaml,
            import_workspace_yaml,
            list_repositories_cmd,
            add_repository_cmd,
            toggle_repository_cmd,
            delete_repository_cmd,
            search_registry_cmd,
            install_skill_cmd,
            update_skill_cmd,
            check_updates_cmd,
            get_settings,
            update_settings,
            get_tool_paths,
            get_app_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
