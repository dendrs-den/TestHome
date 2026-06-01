#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager};

#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg(all(windows, not(debug_assertions)))]
fn configure_release_webview_rendering() {
    // Release WebView2 can render large DSEG glyphs with subpixel seams.
    // These flags keep text rasterization stable without changing layout.
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--disable-font-subpixel-positioning --disable-lcd-text",
    );
}

#[cfg(not(all(windows, not(debug_assertions))))]
fn configure_release_webview_rendering() {}

fn main() {
    configure_release_webview_rendering();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![exit_app])
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
