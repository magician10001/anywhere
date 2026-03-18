# Development Handoff

This document is the fastest way for a new conversation or a new coding agent to get productive in this repo.

## Project Shape

Quick Text Panel is a Windows tray utility built with Tauri 2 + React + Vite.

Core user flow:

1. Copy text anywhere
2. Press the global hotkey
3. Edit in the floating panel
4. Press `Ctrl+Enter` to copy back and hide
5. Paste into the original app

The app is intentionally small. It is not a notes app or document manager.

## Current Product Baseline

What already works:

- tray menu with `Show`, `Hide`, `Settings`, `Quit`
- runtime hotkey update from the settings window
- separate settings window opened from tray
- bottom-right anchored main panel
- plain text / Markdown source editing
- `Esc` hides the panel
- `Ctrl+Enter` writes to clipboard and hides
- draft persistence and clipboard-vs-draft recovery
- capped auto-grow editor with hidden-at-rest scroll treatment
- resize support for the main panel

Current visual direction:

- main panel uses a frameless window
- the latest direction prefers Windows-native undecorated window appearance
- the main panel should feel like a transient utility, not a full app window
- settings window is also custom-drawn, but remains more conventional than the main panel

## Key Files

Frontend:

- `src/app/App.tsx`
  Main window and settings window rendering both live here right now.
- `src/app/app.css`
  Nearly all visual behavior for the panel and settings window is here.
- `src/features/editor/editor-state.ts`
  Draft/clipboard/session state transitions.
- `src/features/editor/draft-storage.ts`
  Local draft persistence.
- `src/features/settings/settings-store.ts`
  Hotkey/default-mode persistence and hotkey capture helpers.
- `src/features/window/panel-metrics.ts`
  Width/height constants and bottom-right anchor helpers.
- `src/features/window/panel-shortcuts.ts`
  `Esc` / `Ctrl+Enter` shortcut interpretation.
- `src/features/window/use-scroll-indicator.ts`
  Temporary scroll-indicator behavior.

Native shell:

- `src-tauri/src/lib.rs`
  Main native control plane: tray, hotkeys, show/hide, settings window creation, clipboard commands, focus-loss behavior.
- `src-tauri/src/main.rs`
  Tauri entrypoint.
- `src-tauri/tauri.conf.json`
  Main window configuration, bundling config, and shell-level appearance settings.

Docs:

- `README.md`
  User-level and repo-level summary.
- `docs/superpowers/specs/2026-03-17-quick-text-panel-design.md`
  Product and UX spec.
- `docs/superpowers/plans/2026-03-17-quick-text-panel.md`
  Implementation plan with progress snapshot.

## Recommended Dev Workflow

Use dev mode for almost all iteration:

```powershell
npm install
npm run tauri:dev
```

Notes:

- `vite.config.ts` is pinned to port `1420` so `tauri:dev` works without extra flags.
- Frontend edits usually hot-reload.
- Rust edits usually rebuild and restart the Tauri window.
- Use `npm run tauri:build` only when you need to verify packaging or release behavior.

## Verification Commands

Use these before claiming a meaningful change is done:

```powershell
npm run test
npm run build
cmd /c '"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && npm run tauri:build'
```

## Known Sensitive Areas

### 1. Main window shell styling

This has been the most fragile area so far.

Important context:

- Windows-native undecorated corners, transparency, and shadow settings interact in non-obvious ways
- fixing one corner artifact previously caused a square outer shell to appear
- the current direction intentionally leans on native window appearance instead of stacking a second fake outer card

If you touch:

- `src-tauri/tauri.conf.json`
- `src/app/app.css`

then manually test:

- default width
- narrow width after resize
- bottom-right appearance
- whether a second outer white frame reappears

### 2. Focus-loss auto-hide

This took several iterations.

Important context:

- immediate hide on `Focused(false)` was too aggressive
- resize interactions can look like blur/focus churn
- current logic uses delayed native focus-loss evaluation plus resize-aware guarding in `src-tauri/src/lib.rs`

If you touch main-panel dismissal, manually retest:

- click away to another app
- open settings from tray
- resize the main panel
- `Esc`
- `Ctrl+Enter`

### 3. Settings close behavior

The custom settings titlebar close button is intentionally routed through a native command instead of relying only on frontend `close()` calls.

Relevant path:

- `close_settings_window` in `src-tauri/src/lib.rs`

### 4. App structure is still somewhat concentrated

The app works, but a lot of behavior still lives in:

- `src/app/App.tsx`
- `src-tauri/src/lib.rs`

If continuing development for a while, it will be worth splitting these into clearer modules.

## Good Next Tasks

If starting a new session, these are the best follow-ups:

1. Final visual polish pass on the main panel across the full resize range.
2. Add more settings, especially launch-on-startup and a clearer default-mode control.
3. Add end-to-end GUI coverage for tray, hotkey, resize, draft restore, and settings.
4. Refactor `App.tsx` and `lib.rs` into smaller units once behavior is stable.

## Current Git Baseline

Latest baseline commit at the time this handoff was written:

- `32c0a26` `feat: bootstrap quick text panel`

## If You Are A New Agent

Recommended first steps:

1. Read this file.
2. Read `README.md`.
3. Read the spec and plan docs.
4. Run `npm run tauri:dev`.
5. Reproduce the exact UI/behavior issue before changing code.

Do not assume the current window-shell behavior is trivial. It is the most failure-prone part of the project so far.
