# Quick Text Panel Design

Date: 2026-03-17
Platform: Windows
Status: In implementation

## Overview

Quick Text Panel is a lightweight Windows tray app for temporarily editing clipboard text and sending the result back to the clipboard. It is designed for a narrow, high-frequency workflow:

1. Copy text from any app
2. Press a global hotkey to open a small editor panel
3. Edit the text in plain text or Markdown mode
4. Press a shortcut to copy the result back to the clipboard and hide the panel
5. Paste the result into the original app

The product goal is speed, low resource usage, and minimal friction. It is not a notes app, document manager, or Obsidian replacement.

## Product Goals

- Open and hide quickly through a global hotkey
- Stay resident with very low idle resource usage
- Match the general visual language of Windows 11
- Support both plain text and Markdown editing contexts
- Preserve unfinished work without forcing users into file management
- Keep the interaction model small and predictable

## Non-Goals

- Note library or knowledge base management
- Multi-document tabs
- Cloud sync
- Rich text or WYSIWYG editing
- Plugin ecosystem
- Attachment or image management
- Full-text search across saved content

## Recommended Technical Direction

The recommended implementation is a Tauri desktop app.

Why this direction:

- Lower expected memory footprint than Electron
- Better fit for a utility that should feel lightweight and responsive
- Good support for tray integration, global shortcuts, window control, and clipboard access
- Flexible enough to build a clean Windows 11-like interface with web UI technologies

Alternatives considered:

- Native .NET desktop app: strongest Windows-native feel, but less flexible editor ecosystem
- Electron: fastest UI iteration, but weaker fit for the low-resource goal

## Primary User Flow

### Open and Edit

1. User copies text in any application
2. User presses a global hotkey such as `Ctrl+Shift+Space`
3. The app shows a single reusable floating panel
4. The app reads clipboard text and loads it into the editor
5. User edits the text

### Commit Result

1. User presses `Ctrl+Enter`
2. The app writes the editor contents back to the clipboard
3. The app clears the draft state
4. The window hides immediately
5. User returns to the original application and pastes

### Hide Without Commit

1. User presses hide or moves focus away from the panel
2. The app hides without changing the clipboard
3. The current draft remains recoverable on the next open

## Window and UX Model

The app is a tray-resident utility with a single reusable floating panel.

### Behavior

- Launches into the system tray
- Registers a global hotkey for show/hide
- Reuses one panel instead of creating a new window each time
- Opens above the taskbar near the bottom-right corner of the active display
- Takes focus immediately on show and hides on explicit dismiss or normal focus loss
- Remembers selected mode and other lightweight preferences
- Supports keyboard-first interaction

### Visual Style

- Windows 11-inspired design language
- Rounded corners and subtle elevation
- Soft borders and restrained contrast
- Frameless presentation with no system title bar or window controls
- Editor-first layout with almost no chrome
- Hidden scrollbar by default, with a very thin temporary indicator while scrolling
- Prefer the native Windows undecorated rounded window shell for the main panel instead of layering a second faux-rounded outer card inside the window

### Suggested Default Panel Size

- Approximately `560 x 360` on first open
- Minimum size approximately `460 x 300`
- Height expands gently with content up to a capped maximum
- User resizing is allowed and the panel is then re-anchored to the bottom-right work area

## Layout

The UI is intentionally compressed into two main regions.

### Minimal Top Strip

- Very thin inline control strip
- Mode switch only: `Plain Text` / `Markdown`
- Small, low-emphasis status text when needed
- No app title, no close button, no settings entry in the main panel

### Editor Area

- Single large editor surface
- Plain text mode uses a clean text editor configuration
- Markdown mode keeps source editing as the primary experience
- Syntax highlighting is allowed, but the panel should stay source-first
- The editor occupies almost all available space
- Internal scrolling is allowed after the panel reaches its height cap
- Scrollbars remain visually hidden unless the user is actively scrolling

## Editing Modes

### Plain Text Mode

- Raw text editing only
- No formatting transformations
- Optimized for quick cleanup and rewriting

### Markdown Mode

- Markdown source editing
- The current implementation keeps the editor source-first
- Preview remains optional and is not currently exposed as a primary panel action

### Switching Rules

- Switching modes must not transform content
- The same text buffer remains intact in either mode
- Mode changes affect editing behavior only in MVP
- Mode switching must not interrupt typing flow or steal focus

## Clipboard and Draft Rules

The open action follows a lightweight decision model.

### On Open

1. If no uncommitted draft exists, load text from the clipboard
2. If an uncommitted draft exists and clipboard text is unchanged, restore the draft
3. If an uncommitted draft exists and clipboard text has changed, offer:
   - Restore draft
   - Load new clipboard text
4. If the clipboard has no editable text, open with an empty editor and show a small status message

### On Copy & Hide

- Write current editor content to the clipboard
- Mark the content as committed
- Clear draft state
- Hide the panel immediately

### On Hide Only

- Do not modify the clipboard
- Preserve current draft

## Panel Interaction Model

The panel should feel closer to a command palette than a standard desktop window.

### Show

- Triggered by global hotkey or tray action
- Appears above the taskbar near the bottom-right of the active display
- Uses a light upward or fade-in motion, not a dramatic center-screen entrance
- Focus lands directly in the editor so the user can type immediately

### Dismiss

- `Esc` hides the panel without committing clipboard changes
- Clicking into another normal application hides the panel
- The current implementation uses native focus-loss handling in the Tauri shell
- Settings remain a separate window and are not part of the main panel flow

### Commit

- `Ctrl+Enter` writes the current text to the clipboard
- Success feedback is brief and non-modal
- The panel hides immediately after commit so the user can return to paste

### Scroll Feedback

- The panel grows with content until a maximum height is reached
- After that, the editor scrolls internally
- Scrollbars are visually hidden at rest
- While scrolling, show a very thin temporary indicator so overflow remains discoverable

## Error Handling

The app should avoid disruptive modal dialogs for routine problems.

Use lightweight inline or toast-style feedback for:

- Clipboard read failure
- Clipboard write failure
- Global hotkey registration conflict
- Draft conflict resolution
- Settings save or hotkey update failure

The product tone should remain calm and low-friction.

## Implementation Snapshot

As of the current workspace state, the following parts are implemented:

- tray menu with `Show`, `Hide`, `Settings`, `Quit`
- global hotkey registration plus runtime update from settings
- separate settings window with captured hotkey entry
- frameless main panel with bottom-right positioning
- plain text and Markdown mode switch
- draft persistence and clipboard conflict recovery
- native commit-and-hide and hide-only commands in the Rust shell
- hidden-at-rest editor scrollbar with a temporary scroll indicator
- main panel styling now follows the native Windows undecorated shell more closely, with the content layer aligned directly to the window instead of a nested white wrapper

Known visual polish still open:

- the current native-shell presentation still needs a final manual dev-mode visual pass to confirm width changes feel clean across the full resize range

## Settings

MVP settings should remain very small:

- Global hotkey
- Default mode
- Launch on startup

Settings are opened from the tray menu in a separate settings window. The main panel remains editing-only and should not contain configuration controls.

## Architecture

High-level component breakdown:

- Tray/App Shell
  - App lifecycle
  - Tray menu
  - Startup behavior
- Window Controller
  - Show/hide
  - Bottom-right work-area positioning
  - Focus-loss dismissal rules
  - Focus behavior
- Hotkey Service
  - Register and update global shortcuts
- Clipboard Service
  - Read and write text content
- Draft Service
  - Track dirty state
  - Restore unfinished text
  - Resolve clipboard-vs-draft conflicts
- Editor Surface
  - Plain text mode
  - Markdown mode
  - Auto-grow until capped height
  - Hidden-scrollbar behavior
- Settings Store
  - Persist user preferences locally

Each unit should remain focused and independently testable.

## Testing Strategy

### Unit Tests

- Draft state transitions
- Clipboard-vs-draft resolution logic
- Settings persistence
- Mode switching without content mutation

### Integration Tests

- Show/hide window lifecycle
- Bottom-right placement on active display work area
- Frameless panel open and dismiss behavior
- Copy from clipboard, edit, copy back
- Draft recovery after hide
- Hotkey configuration changes

Current automated coverage is unit-heavy. End-to-end GUI coverage is still missing.

### Manual Validation

- Launch on Windows 11
- Verify tray behavior
- Verify wake latency feels near-instant
- Check keyboard-only workflow
- Confirm the panel feels like a transient utility rather than a standard app window
- Confirm scroll overflow remains usable when the scrollbar is hidden at rest
- Confirm idle memory stays appropriately low for a tray utility

## MVP Scope

The first release includes:

- Tray-resident app
- Global hotkey to show/hide
- Single reusable floating panel
- Clipboard text load on open
- Plain text and Markdown modes
- `Ctrl+Enter` to copy back and hide
- Hide without commit
- Draft preservation and restore
- Separate settings window opened from the tray menu
- Frameless bottom-right panel presentation
- Persisted mode and runtime-managed panel geometry
- Windows 11-aligned lightweight UI

## Future Enhancements

Possible later additions:

- Clipboard history for recent sessions
- Reusable text snippets or templates
- Richer Markdown preview
- Automation to paste back into the previously focused app
- Command palette
- OCR or screenshot-to-text entry

## Open Questions For Planning

- Which editor component best balances footprint and editing quality in Tauri
- Whether preview should be implemented in MVP or immediately after
- How draft-vs-clipboard conflict should be presented without slowing the main flow
- Whether the default hotkey should be configurable during first launch or only in settings
