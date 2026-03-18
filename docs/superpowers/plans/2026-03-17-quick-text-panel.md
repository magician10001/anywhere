# Quick Text Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing Tauri app into a frameless bottom-right floating text panel that feels transient, editor-first, and fast to summon or dismiss.

**Architecture:** Keep the current Tauri shell and React frontend, but split the work into focused passes: first lock down window behavior and positioning in `src-tauri`, then reshape the panel UI and editor sizing in the web app, then polish dismissal, overflow, and settings interactions so the panel behaves like a lightweight utility instead of a standard app window. Preserve existing clipboard, draft, and hotkey behavior unless the new panel model requires a targeted adjustment.

**Tech Stack:** Tauri 2, Rust, TypeScript, React, Vite, Vitest

---

## Progress Snapshot

This plan is partially executed in the current workspace.

Completed in code:

- frameless main panel shell
- native Windows undecorated main-window shell styling
- tray menu and separate settings window
- bottom-right work-area anchoring
- global hotkey update flow
- compact editor-first main panel layout
- draft recovery and clipboard conflict flow
- capped auto-grow behavior
- hidden-at-rest scrollbar treatment
- native commit-and-hide and hide-only commands
- focus-loss auto-hide

Still open or needing another pass:

- final manual visual polish pass on the native-corner presentation across the full resize range
- documentation and architecture notes beyond this plan/spec pair
- end-to-end GUI coverage

## Proposed File Structure

### Frontend

- Modify: `src/app/App.tsx`
- Modify: `src/app/app.css`
- Create: `src/features/window/panel-metrics.ts`
- Create: `src/features/window/panel-metrics.test.ts`
- Create: `src/features/window/use-scroll-indicator.ts`
- Create: `src/features/window/use-scroll-indicator.test.ts`
- Modify: `src/features/settings/settings-store.ts`
- Modify: `tests/editor-state.test.ts`
- Modify: `tests/settings-store.test.ts`

### Native Shell

- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/tauri.conf.json`

### Docs

- Modify: `docs/superpowers/specs/2026-03-17-quick-text-panel-design.md`
- Modify: `docs/superpowers/plans/2026-03-17-quick-text-panel.md`
- Modify: `README.md`

## Chunk 1: Frameless Panel Shell

Status: Mostly complete

### Task 1: Lock the main window into a frameless utility panel

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Read the current main-window configuration and note which settings still imply a normal app window**

Run: `Get-Content src-tauri\\tauri.conf.json`
Expected: existing main window config still shows a conventional resizable desktop window setup

- [ ] **Step 2: Write a short checklist in the Rust shell comments or nearby notes for the new panel shell rules**

Checklist to encode:
- no system title bar
- no visible task-window chrome
- panel remains focusable
- settings window keeps conventional behavior

- [ ] **Step 3: Update the Tauri main window configuration to remove native chrome**

Set the main window configuration to a frameless panel-oriented baseline:

```json
{
  "label": "main",
  "decorations": false,
  "transparent": true,
  "resizable": false,
  "skipTaskbar": true,
  "visible": false,
  "width": 420,
  "height": 260
}
```

- [ ] **Step 4: Adjust Rust startup logic so only the main panel is frameless and the settings window stays conventional**

Expected implementation shape:

```rust
fn build_settings_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("Quick Text Panel Settings")
        .decorations(true)
        .build()
}
```

- [ ] **Step 5: Run the frontend and native build checks**

Run: `npm run build`
Run: `cmd /c "\"C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat\" && set PATH=%USERPROFILE%\\.cargo\\bin;%PATH% && npm run tauri:build"`
Expected: both commands pass and the main window no longer depends on native title-bar chrome

- [ ] **Step 6: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/src/main.rs src-tauri/src/lib.rs
git commit -m "feat: switch main window to frameless panel shell"
```

### Task 2: Position the panel above the taskbar at the bottom-right of the active display

**Files:**
- Create: `src/features/window/panel-metrics.ts`
- Create: `src/features/window/panel-metrics.test.ts`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write the failing unit tests for panel sizing and anchor calculations**

```ts
import { describe, expect, it } from "vitest";
import { clampPanelHeight, getPanelAnchor } from "./panel-metrics";

describe("clampPanelHeight", () => {
  it("caps panel height at the configured maximum", () => {
    expect(clampPanelHeight(900, { min: 260, max: 560 })).toBe(560);
  });
});

describe("getPanelAnchor", () => {
  it("places the panel above the work-area bottom-right edge", () => {
    expect(
      getPanelAnchor(
        { x: 0, y: 0, width: 1600, height: 900 },
        { width: 420, height: 320 },
        { right: 20, bottom: 20 }
      )
    ).toEqual({ x: 1160, y: 560 });
  });
});
```

- [ ] **Step 2: Run the test file and verify it fails**

Run: `npm run test -- src/features/window/panel-metrics.test.ts`
Expected: FAIL because the helper module does not exist yet

- [ ] **Step 3: Implement minimal panel metric helpers in TypeScript**

```ts
export function clampPanelHeight(value: number, limits: { min: number; max: number }) {
  return Math.min(limits.max, Math.max(limits.min, value));
}
```

Include:
- height clamp
- bottom-right anchor math
- exported constants for panel width, min height, max height, and margins

- [ ] **Step 4: Port the same positioning rules into the Rust window controller**

Expected implementation shape:

```rust
fn position_main_panel(window: &WebviewWindow, monitor: &Monitor, size: PhysicalSize<u32>) -> tauri::Result<()> {
    let x = monitor.position().x + monitor.size().width as i32 - size.width as i32 - 20;
    let y = monitor.position().y + monitor.size().height as i32 - size.height as i32 - 20;
    window.set_position(PhysicalPosition::new(x, y).into())?;
    Ok(())
}
```

Use the display work area when available instead of blindly trusting full monitor bounds.

- [ ] **Step 5: Run unit tests and a production build**

Run: `npm run test -- src/features/window/panel-metrics.test.ts`
Run: `npm run build`
Expected: panel math tests pass and frontend build remains green

- [ ] **Step 6: Commit**

```bash
git add src/features/window/panel-metrics.ts src/features/window/panel-metrics.test.ts src-tauri/src/lib.rs
git commit -m "feat: anchor panel above taskbar at bottom right"
```

## Chunk 2: Minimal Panel UI

Status: Mostly complete

### Task 3: Compress the main panel layout into a minimal top strip and editor-first body

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/app.css`

- [ ] **Step 1: Write the failing UI tests for the compact main panel**

Add tests that assert:
- the main panel does not render an app title
- the main panel does not render settings controls
- the main panel still renders the mode switch
- the main panel still renders the editor and status feedback

Test shape:

```ts
it("keeps the main panel editor-first", () => {
  render(<App />);
  expect(screen.queryByText(/quick text panel/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /settings/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /markdown/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test file and verify it fails**

Run: `npm run test -- tests/editor-state.test.ts`
Expected: FAIL because the current app shell still exposes a fuller app layout

- [ ] **Step 3: Rewrite the main panel markup around a tiny top strip and dominant editor area**

Target structure:

```tsx
<main className="panel-shell">
  <header className="panel-strip">
    <div className="mode-toggle">...</div>
    <p className="panel-status">Draft restored</p>
  </header>
  <section className="panel-editor">...</section>
</main>
```

Do not include:
- visible app title
- close button
- settings button
- bottom action bar

- [ ] **Step 4: Update CSS so the panel reads as a floating utility, not a standard app**

Required style direction:
- transparent outer window background
- rounded floating card
- subtle border and elevation
- compact padding
- text and controls scaled down modestly
- no visual scrollbar track at rest

- [ ] **Step 5: Run tests and frontend build**

Run: `npm run test -- tests/editor-state.test.ts`
Run: `npm run build`
Expected: tests pass and the new shell compiles cleanly

- [ ] **Step 6: Commit**

```bash
git add src/app/App.tsx src/app/app.css tests/editor-state.test.ts
git commit -m "feat: redesign main panel as minimal floating editor"
```

### Task 4: Make panel height grow gently with content and cap it before overflow scrolling

**Files:**
- Create: `src/features/window/use-scroll-indicator.ts`
- Create: `src/features/window/use-scroll-indicator.test.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/app/app.css`

- [ ] **Step 1: Write failing tests for scroll-indicator visibility timing**

```ts
import { describe, expect, it, vi } from "vitest";
import { createScrollIndicatorController } from "./use-scroll-indicator";

describe("createScrollIndicatorController", () => {
  it("shows the indicator during scrolling and hides it after idle time", () => {
    vi.useFakeTimers();
    const controller = createScrollIndicatorController(700);
    controller.onScroll();
    expect(controller.visible).toBe(true);
    vi.advanceTimersByTime(701);
    expect(controller.visible).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test file and verify it fails**

Run: `npm run test -- src/features/window/use-scroll-indicator.test.ts`
Expected: FAIL because the helper does not exist yet

- [ ] **Step 3: Implement the minimal scroll-indicator helper**

```ts
export function createScrollIndicatorController(timeoutMs = 700) {
  return {
    visible: false,
    onScroll() {
      this.visible = true;
    }
  };
}
```

Expand it enough to support:
- show on scroll
- hide after idle timeout
- cleanup on unmount

- [ ] **Step 4: Connect editor content height to panel height clamps**

Implementation notes:
- measure textarea or editor scroll height
- derive panel height through `clampPanelHeight`
- apply the computed height to the panel container
- only enable internal overflow after the cap is reached

- [ ] **Step 5: Add CSS for hidden-at-rest scrollbar and thin visible-on-scroll indicator**

Required behavior:
- native scrollbar track hidden at rest
- custom indicator rail only appears while scrolling
- indicator styling stays extremely subtle

- [ ] **Step 6: Run tests and frontend build**

Run: `npm run test -- src/features/window/use-scroll-indicator.test.ts`
Run: `npm run build`
Expected: scroll indicator logic passes tests and the panel still builds

- [ ] **Step 7: Commit**

```bash
git add src/features/window/use-scroll-indicator.ts src/features/window/use-scroll-indicator.test.ts src/app/App.tsx src/app/app.css
git commit -m "feat: add capped auto-grow panel behavior"
```

## Chunk 3: Dismissal And Flow Polish

Status: Implemented, with minor visual polish still open

### Task 5: Make the panel dismiss on focus loss without breaking settings or tray flows

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Write the failing behavior notes for focus-loss dismissal**

Capture the expected cases in comments or a lightweight checklist:
- main panel hides when focus moves to another normal app
- main panel does not hide while opening settings
- commit and hide remains stable
- tray interactions do not trigger accidental self-dismiss loops

- [ ] **Step 2: Add or update tests for any frontend state that depends on dismiss reasons**

Suggested assertion:

```ts
it("preserves draft state when hide is triggered without commit", () => {
  // existing hide path should still preserve the draft
});
```

- [ ] **Step 3: Implement a guarded focus-loss handler in Rust**

Expected implementation shape:

```rust
fn should_hide_for_focus_change(next_target: Option<&str>) -> bool {
    !matches!(next_target, Some("settings") | Some("tray"))
}
```

Hook the logic into the main panel's focus or blur lifecycle without applying it to the settings window.

- [ ] **Step 4: Verify that `Esc`, `Ctrl+Enter`, and tray-driven settings opening still behave correctly**

Run: `npm run test`
Run: `npm run build`
Expected: no regressions in draft preservation or command flow

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src/app/App.tsx tests/editor-state.test.ts
git commit -m "feat: auto-dismiss panel on safe focus loss"
```

### Task 6: Keep settings behavior aligned with the new panel model

**Files:**
- Modify: `src/features/settings/settings-store.ts`
- Modify: `tests/settings-store.test.ts`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Write the failing tests for the reduced main-panel settings footprint**

Test assertions:
- settings remain available in the dedicated settings window
- main panel no longer owns settings layout concerns
- default-mode preference still loads correctly

- [ ] **Step 2: Run the focused settings test file and verify it fails if coverage is missing**

Run: `npm run test -- tests/settings-store.test.ts`
Expected: FAIL or incomplete coverage for the dedicated settings-window assumptions

- [ ] **Step 3: Implement only the settings adjustments required by the new panel model**

Keep scope narrow:
- no settings trigger in the main panel
- no geometry preference that conflicts with fixed-width bottom-right positioning
- preserve hotkey and default-mode preferences

- [ ] **Step 4: Run settings tests and full frontend tests**

Run: `npm run test -- tests/settings-store.test.ts`
Run: `npm run test`
Expected: settings coverage passes and existing flows remain green

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/settings-store.ts tests/settings-store.test.ts src/app/App.tsx
git commit -m "refactor: align settings flow with minimal panel design"
```

## Chunk 4: Verification And Docs

Status: Mostly complete

### Task 7: Update docs and verification notes to reflect the new product shape

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-03-17-quick-text-panel-design.md`
- Modify: `docs/superpowers/plans/2026-03-17-quick-text-panel.md`

- [ ] **Step 1: Update README usage text to describe the frameless bottom-right panel**
- [x] **Step 1: Update README usage text to describe the frameless bottom-right panel**

Include:
- summon from hotkey
- edit in a floating panel
- commit with `Ctrl+Enter`
- tray menu opens settings

- [ ] **Step 2: Add a short verification checklist for manual QA**
- [x] **Step 2: Add a short verification checklist for manual QA**

Checklist:
- panel appears above taskbar at bottom-right
- no system title bar is visible
- panel grows until capped height
- scrollbar remains hidden until scrolling
- clicking away hides the panel
- settings still open from tray

- [ ] **Step 3: Run final verification commands**
- [x] **Step 3: Run final verification commands**

Run: `npm run test`
Run: `npm run build`
Run: `cmd /c "\"C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat\" && set PATH=%USERPROFILE%\\.cargo\\bin;%PATH% && npm run tauri:build"`
Expected: all tests and both builds pass

- [ ] **Step 4: Commit**
- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/2026-03-17-quick-text-panel-design.md docs/superpowers/plans/2026-03-17-quick-text-panel.md
git commit -m "docs: document minimal floating panel behavior"
```
