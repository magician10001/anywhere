<p align="center">
  <img src="./src-tauri/icons/128x128.png" alt="Anywhere icon" width="96" height="96" />
</p>

<h1 align="center">Anywhere</h1>

<p align="center">
  A fast Windows tray clipboard scratchpad with a lightweight floating editor, Markdown preview, and keyboard-first workflow.
</p>

## Overview

Anywhere is a desktop utility for quickly pulling text out of the clipboard, editing it in a focused floating panel, and sending it back without the friction of opening a full editor.

It is designed for short-lived writing and transformation tasks: rewriting copied text, cleaning Markdown, fixing formatting, or staging clipboard content before pasting it elsewhere.

## Features

- Lightweight tray-first workflow with `Show`, `Hide`, `Settings`, and `Quit`
- Global hotkey support with live updates from the settings window
- Frameless floating panel anchored near the lower-right work area
- Plain text and Markdown editing modes
- Docked Markdown preview without sacrificing editor space
- Auto-growing panel behavior with capped internal scrolling
- Draft preservation and clipboard-vs-draft conflict recovery
- Keyboard-first interactions including `Esc` to hide and `Ctrl+Enter` to copy back and dismiss

## Why Anywhere

- Fast to open, use, and dismiss
- Purpose-built for transient clipboard editing rather than document management
- Native-feeling window behavior with minimal chrome and tray-driven access
- Small, focused codebase built with modern Tauri, React, and TypeScript

## Getting Started

### Prerequisites

- Node.js
- Rust toolchain
- Visual Studio Build Tools with MSVC when building Windows installers

### Development

```bash
npm install
npm run test
npm run build
npm run tauri:dev
```

### Production Build

```bash
npm run tauri:build
```

Windows bundles are emitted under `src-tauri/target/release/bundle/`.

## Tech Stack

- Tauri 2
- React 19
- TypeScript
- Vitest
- Rust

## Project Structure

- `src/app` - application shell, layout, and window-specific UI
- `src/features/editor` - editor session state, draft persistence, and Markdown preview rendering
- `src/features/settings` - settings persistence and hotkey helpers
- `src/features/window` - panel sizing, shortcuts, and scroll indicator behavior
- `src-tauri/src/lib.rs` - native window lifecycle, tray integration, clipboard commit, and hotkey wiring

## Roadmap

- Additional Markdown rendering polish and visual refinements
- End-to-end GUI coverage for critical flows
- Continued fit-and-finish work on Windows-native panel behavior

## Contributing

This project is currently optimized for local development on Windows. If you want to contribute, start by running the test suite and `tauri:dev`, then keep changes aligned with the existing lightweight, editor-first interaction model.

## License

MIT
