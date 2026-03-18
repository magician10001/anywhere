#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Monitor, PhysicalPosition, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

struct ShortcutStateStore(Mutex<String>);
struct WindowInteractionState {
    last_resize_at: Mutex<Option<Instant>>,
    resize_in_progress: Mutex<bool>,
}

const PANEL_MARGIN_RIGHT: i32 = 20;
const PANEL_MARGIN_BOTTOM: i32 = 20;
const RESIZE_HIDE_GRACE_PERIOD: Duration = Duration::from_millis(400);

fn should_hide_main_panel_on_focus_loss(
    blur_started_at: Instant,
    resize_in_progress: bool,
    last_resize_at: Option<Instant>,
) -> bool {
    if resize_in_progress {
        return false;
    }

    match last_resize_at {
        Some(timestamp) => timestamp < blur_started_at,
        None => true,
    }
}

fn mark_resize_in_progress(app: &tauri::AppHandle, timestamp: Instant) {
    let interaction_state = app.state::<WindowInteractionState>();
    *interaction_state.last_resize_at.lock().unwrap() = Some(timestamp);
    *interaction_state.resize_in_progress.lock().unwrap() = true;

    let app_handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(RESIZE_HIDE_GRACE_PERIOD);

        let interaction_state = app_handle.state::<WindowInteractionState>();
        let mut last_resize_at = interaction_state.last_resize_at.lock().unwrap();

        if *last_resize_at != Some(timestamp) {
            return;
        }

        *last_resize_at = None;
        drop(last_resize_at);

        *interaction_state.resize_in_progress.lock().unwrap() = false;
    });
}

fn active_monitor(window: &WebviewWindow) -> tauri::Result<Option<Monitor>> {
    if let Some(monitor) = window.current_monitor()? {
        return Ok(Some(monitor));
    }

    window.primary_monitor()
}

fn position_main_panel(window: &WebviewWindow) -> tauri::Result<()> {
    let size = window.outer_size()?;

    let Some(monitor) = active_monitor(window)? else {
        return Ok(());
    };

    let work_area = monitor.work_area();
    let x = work_area.position.x + work_area.size.width as i32 - size.width as i32 - PANEL_MARGIN_RIGHT;
    let y = work_area.position.y + work_area.size.height as i32 - size.height as i32 - PANEL_MARGIN_BOTTOM;
    window.set_position(PhysicalPosition::new(x, y))?;

    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    let window = app
        .get_webview_window("main")
        .expect("main window should exist");

    position_main_panel(&window)?;
    window.show()?;
    window.set_focus()?;

    Ok(())
}

fn hide_main_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    let window = app
        .get_webview_window("main")
        .expect("main window should exist");

    window.hide()?;

    Ok(())
}

fn toggle_main_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    let window = app
        .get_webview_window("main")
        .expect("main window should exist");

    if window.is_visible()? {
        window.hide()?;
    } else {
        position_main_panel(&window)?;
        window.show()?;
        window.set_focus()?;
    }

    Ok(())
}

fn build_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
    let hide = MenuItemBuilder::with_id("hide", "Hide").build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
    let menu = MenuBuilder::new(app)
        .items(&[&show, &hide, &settings, &quit])
        .build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Quick Text Panel")
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = toggle_main_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                let _ = show_main_window(app);
            }
            "hide" => {
                let _ = hide_main_window(app);
            }
            "settings" => {
                let _ = show_settings_window(app);
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn show_settings_window(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("settings") {
        window.show()?;
        window.set_focus()?;
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("Quick Text Panel Settings")
        .inner_size(620.0, 420.0)
        .resizable(false)
        .transparent(false)
        .decorations(false)
        .center()
        .build()?;

    Ok(())
}

fn register_global_shortcut(app: &tauri::AppHandle, shortcut: &str) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|error| error.to_string())?;

    app.global_shortcut()
        .on_shortcut(shortcut, |app, _, event| {
            if event.state == ShortcutState::Pressed {
                let _ = toggle_main_window(app);
            }
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn hide_main_panel(app: tauri::AppHandle) -> Result<(), String> {
    hide_main_window(&app).map_err(|error| error.to_string())
}

#[tauri::command]
fn close_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.close().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn commit_text_and_hide(app: tauri::AppHandle, text: String) -> Result<(), String> {
    app.clipboard()
        .write_text(text)
        .map_err(|error| error.to_string())?;

    hide_main_window(&app).map_err(|error| error.to_string())
}

#[tauri::command]
fn set_main_panel_resize_state(
    app: tauri::AppHandle,
    resizing: bool,
) -> Result<(), String> {
    let interaction_state = app.state::<WindowInteractionState>();

    if resizing {
        drop(interaction_state);
        mark_resize_in_progress(&app, Instant::now());
        return Ok(());
    }

    *interaction_state.resize_in_progress.lock().unwrap() = false;
    *interaction_state.last_resize_at.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
fn update_global_shortcut(
    app: tauri::AppHandle,
    shortcut_state: State<'_, ShortcutStateStore>,
    shortcut: String,
) -> Result<(), String> {
    register_global_shortcut(&app, &shortcut)?;
    *shortcut_state.0.lock().unwrap() = shortcut;
    Ok(())
}

pub fn run() {
    #[cfg(desktop)]
    let builder = tauri::Builder::default().plugin(tauri_plugin_global_shortcut::Builder::new().build());

    #[cfg(not(desktop))]
    let builder = tauri::Builder::default();

    builder
        .manage(ShortcutStateStore(Mutex::new(
            "CommandOrControl+Shift+Space".to_string(),
        )))
        .manage(WindowInteractionState {
            last_resize_at: Mutex::new(None),
            resize_in_progress: Mutex::new(false),
        })
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            update_global_shortcut,
            hide_main_panel,
            close_settings_window,
            commit_text_and_hide,
            set_main_panel_resize_state
        ])
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            match event {
                WindowEvent::Resized(_) => {
                    mark_resize_in_progress(&window.app_handle(), Instant::now());
                }
                WindowEvent::Focused(false) => {
                    let app = window.app_handle().clone();
                    let blur_started_at = Instant::now();

                    std::thread::spawn(move || {
                        std::thread::sleep(Duration::from_millis(120));

                        let interaction_state = app.state::<WindowInteractionState>();
                        let resize_in_progress = *interaction_state.resize_in_progress.lock().unwrap();
                        let last_resize_at = *interaction_state.last_resize_at.lock().unwrap();
                        drop(interaction_state);

                        if !should_hide_main_panel_on_focus_loss(
                            blur_started_at,
                            resize_in_progress,
                            last_resize_at,
                        ) {
                            return;
                        }

                        if let Some(window) = app.get_webview_window("main") {
                            let should_hide =
                                window.is_visible().unwrap_or(false) && !window.is_focused().unwrap_or(false);

                            if should_hide {
                                let _ = window.hide();
                            }
                        }
                    });
                }
                WindowEvent::Focused(true) => {
                    let interaction_state = window.state::<WindowInteractionState>();
                    *interaction_state.last_resize_at.lock().unwrap() = None;
                    *interaction_state.resize_in_progress.lock().unwrap() = false;
                }
                _ => {}
            }
        })
        .setup(|app| {
            register_global_shortcut(app.handle(), "CommandOrControl+Shift+Space")?;
            build_tray(app.handle())?;
            hide_main_window(app.handle())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_auto_hide_inside_resize_grace_period() {
        assert!(!should_hide_main_panel_on_focus_loss(
            Instant::now(),
            true,
            None
        ));
    }

    #[test]
    fn allows_auto_hide_after_resize_grace_period() {
        assert!(should_hide_main_panel_on_focus_loss(
            Instant::now(),
            false,
            None
        ));
    }

    #[test]
    fn skips_auto_hide_when_resize_is_observed_after_blur() {
        let blur_started_at = Instant::now();
        let resize_after_blur = Some(blur_started_at + Duration::from_millis(1));

        assert!(!should_hide_main_panel_on_focus_loss(
            blur_started_at,
            false,
            resize_after_blur
        ));
    }
}
