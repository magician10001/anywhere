# Quick Text Panel

Quick Text Panel is a Windows tray utility for temporarily editing clipboard text in a lightweight floating panel.

## Current Status

The app is now usable as a local Windows build:

- tray resident with `Show`, `Hide`, `Settings`, and `Quit`
- global hotkey registration and live hotkey updates from the settings window
- separate settings window opened from the tray menu
- frameless floating main panel shown near the bottom-right work area
- plain text and Markdown source editing modes
- `Esc` hides the panel
- `Ctrl+Enter` copies editor text back to the clipboard and hides the panel
- draft preservation plus clipboard-vs-draft conflict recovery
- capped panel auto-grow with hidden-at-rest editor scrollbar behavior
- Windows-native undecorated main window styling, with the panel content aligned to the native shell instead of a nested faux card

## What The App Currently Feels Like

The main panel is intentionally not a full desktop window. It is a frameless floating editor with:

- a compact mode switch strip
- editor-first layout
- native Windows undecorated rounded window chrome
- hidden taskbar entry for the main panel
- tray-driven settings access
- automatic hide on focus loss

## Current Gaps

These are the main polish items still open:

- the switch back to Windows-native undecorated corners needs a final manual visual pass in dev mode
- README-level architecture notes are brief and not yet split into a dedicated architecture doc
- the plan document is partially executed but not yet fully checked off line by line
- there are no end-to-end GUI tests yet

## Development

### Prerequisites

- Node.js
- Rust toolchain
- Visual Studio Build Tools with MSVC for Windows packaging

### Commands

```bash
npm install
npm run test
npm run build
npm run tauri:dev
npm run tauri:build
```

### Installer Output

Successful Windows bundles are produced at:

- `src-tauri/target/release/bundle/msi/Quick Text Panel_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Quick Text Panel_0.1.0_x64-setup.exe`

## Key Files

- `src/app/App.tsx`
- `src/app/app.css`
- `src/features/editor/editor-state.ts`
- `src/features/settings/settings-store.ts`
- `src/features/window/panel-metrics.ts`
- `src/features/window/panel-shortcuts.ts`
- `src/features/window/use-scroll-indicator.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`
