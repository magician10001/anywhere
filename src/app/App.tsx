import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import {
  applySessionAction,
  createInitialSessionState,
  resolveConflictChoice,
  resolveEditorContent,
  type DraftSnapshot,
  type ResolveEditorResult,
  type EditorMode,
  type SessionState
} from "../features/editor/editor-state";
import { clearDraft, loadDraft, saveDraft } from "../features/editor/draft-storage";
import { renderMarkdownPreview } from "../features/editor/markdown-preview";
import {
  captureHotkeyFromEvent,
  formatHotkeyForTauri,
  loadSettings,
  normalizeHotkey,
  saveSettings
} from "../features/settings/settings-store";
import {
  getEditorWidthFromFrame,
  getEditorLayout,
  getScrollIndicatorLayout,
  getWorkspaceWidth,
  PANEL_DEFAULT_HEIGHT,
  PANEL_DEFAULT_WIDTH,
  PANEL_MAX_HEIGHT,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH
} from "../features/window/panel-metrics";
import { getPanelShortcutAction } from "../features/window/panel-shortcuts";
import { useScrollIndicator } from "../features/window/use-scroll-indicator";

const EDITOR_HINT = "Paste or type here, then press Ctrl+Enter to copy back and hide.";
const PREVIEW_DOCK_WIDTH = 420;
const PREVIEW_DOCK_GAP = 16;
type PanelResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";
const PANEL_RESIZE_DIRECTIONS: PanelResizeDirection[] = [
  "North",
  "South",
  "East",
  "West",
  "NorthEast",
  "NorthWest",
  "SouthEast",
  "SouthWest"
];

function changeMode(state: SessionState, mode: EditorMode): SessionState {
  return applySessionAction(state, {
    type: "mode-changed",
    mode
  });
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function currentWindowLabel(): "main" | "settings" {
  if (!isTauriRuntime()) {
    return "main";
  }

  if (getCurrentWindow().label === "settings") {
    return "settings";
  }

  return "main";
}

const SCROLL_INDICATOR_HEIGHT = 38;
const SCROLL_INDICATOR_TOP_INSET = 12;
const SCROLL_INDICATOR_BOTTOM_INSET = 12;

export function App() {
  const [windowKind] = useState<"main" | "settings">(() => currentWindowLabel());
  const [settings, setSettings] = useState(() => loadSettings());
  const [state, setState] = useState(() =>
    createInitialSessionState({
      text: "",
      mode: loadSettings().defaultMode,
      sourceClipboardText: ""
    })
  );
  const [status, setStatus] = useState("Ready");
  const [pendingConflict, setPendingConflict] = useState<Extract<ResolveEditorResult, { kind: "conflict" }> | null>(null);
  const [hotkeyDraft, setHotkeyDraft] = useState(settings.hotkey);
  const [panelHeight, setPanelHeight] = useState(PANEL_DEFAULT_HEIGHT);
  const [editorWidth, setEditorWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [textareaHeight, setTextareaHeight] = useState<number | null>(null);
  const [textareaOverflowY, setTextareaOverflowY] = useState<"hidden" | "auto">("hidden");
  const [isPanelCapped, setIsPanelCapped] = useState(false);
  const [manualHeightLocked, setManualHeightLocked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollIndicatorOffsetY, setScrollIndicatorOffsetY] = useState(SCROLL_INDICATOR_TOP_INSET);
  const panelRef = useRef<HTMLElement | null>(null);
  const editorSurfaceRef = useRef<HTMLLabelElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isProgrammaticResizeRef = useRef(false);
  const { visible: showScrollIndicator, onScroll: handleScrollIndicator } = useScrollIndicator();
  const previewHtml = renderMarkdownPreview(state.text);

  useEffect(() => {
    if (windowKind !== "main") {
      return;
    }

    if (!isTauriRuntime()) {
      setStatus("Running in browser preview mode");
      return;
    }

    let cancelled = false;

    async function loadClipboard() {
      try {
        const clipboardText = isTauriRuntime() ? await readText() : "";
        const draft = loadDraft();

        if (!cancelled) {
          hydrateEditor(clipboardText, draft);
        }
      } catch {
        if (!cancelled) {
          setStatus("Clipboard unavailable");
        }
      }
    }

    void loadClipboard();

    return () => {
      cancelled = true;
    };
  }, [settings.defaultMode, windowKind]);

  useEffect(() => {
    if (!isTauriRuntime() || windowKind !== "main") {
      return;
    }

    async function syncHotkey() {
      try {
        await invoke("update_global_shortcut", {
          shortcut: formatHotkeyForTauri(settings.hotkey)
        });
      } catch {
        setStatus(`Failed to register hotkey ${settings.hotkey}`);
      }
    }

    void syncHotkey();
  }, [settings.hotkey, windowKind]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let unlisten: (() => void) | undefined;
    let unlistenResize: (() => void) | undefined;

    void getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused) {
        textareaRef.current?.focus();
      }
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    void getCurrentWindow().onResized(({ payload: size }) => {
      const scaleFactor = window.devicePixelRatio || 1;
      const nextLogicalHeight = Math.round(size.height / scaleFactor);
      const nextLogicalWidth = Math.round(size.width / scaleFactor);

      setPanelHeight(nextLogicalHeight);

      if (!isProgrammaticResizeRef.current) {
        setEditorWidth(
          getEditorWidthFromFrame({
            frameWidth: nextLogicalWidth,
            previewOpen: state.previewOpen,
            previewWidth: PREVIEW_DOCK_WIDTH,
            gap: PREVIEW_DOCK_GAP,
            minEditorWidth: PANEL_MIN_WIDTH
          })
        );
        setManualHeightLocked(true);
      }
    }).then((nextUnlistenResize) => {
      unlistenResize = nextUnlistenResize;
    });

    return () => {
      unlisten?.();
      unlistenResize?.();
    };
  }, [state.previewOpen, windowKind]);

  useLayoutEffect(() => {
    if (windowKind !== "main") {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const previousInlineHeight = textarea.style.height;
    textarea.style.height = "auto";
    const currentPanelClientHeight = panelRef.current?.getBoundingClientRect().height ?? panelHeight;

    const nextLayout = getEditorLayout({
      currentPanelHeight: Math.round(currentPanelClientHeight),
      editorScrollHeight: textarea.scrollHeight,
      chromeHeight: 56,
      minPanelHeight: PANEL_MIN_HEIGHT,
      maxPanelHeight: PANEL_MAX_HEIGHT,
      manualHeightLocked
    });

    setTextareaHeight(nextLayout.textareaHeight);
    setTextareaOverflowY(nextLayout.overflowY);
    setIsPanelCapped(nextLayout.capped);

    textarea.style.height = nextLayout.textareaHeight === null ? "" : `${nextLayout.textareaHeight}px`;

    if (!isTauriRuntime()) {
      setPanelHeight(nextLayout.panelHeight);
      return;
    }

    async function syncPanelGeometry() {
      const currentSize = await getCurrentWindow().innerSize();
      const scaleFactor = window.devicePixelRatio || 1;
      const currentLogicalHeight = Math.round(currentSize.height / scaleFactor) || PANEL_DEFAULT_HEIGHT;
      const currentLogicalWidth = Math.round(currentSize.width / scaleFactor) || PANEL_DEFAULT_WIDTH;
      const nextLogicalHeight = manualHeightLocked
        ? currentLogicalHeight
        : nextLayout.capped
          ? Math.max(currentLogicalHeight, nextLayout.panelHeight)
          : nextLayout.panelHeight;
      const nextLogicalWidth = getWorkspaceWidth({
        editorWidth,
        previewOpen: state.previewOpen,
        previewWidth: PREVIEW_DOCK_WIDTH,
        gap: PREVIEW_DOCK_GAP
      });

      setPanelHeight(nextLogicalHeight);

      if (nextLogicalHeight === currentLogicalHeight && nextLogicalWidth === currentLogicalWidth) {
        return;
      }

      isProgrammaticResizeRef.current = true;

      try {
        await invoke("sync_main_panel_frame", {
          height: nextLogicalHeight,
          width: nextLogicalWidth
        });
      } finally {
        window.setTimeout(() => {
          isProgrammaticResizeRef.current = false;
        }, 0);
      }
    }

    void syncPanelGeometry();
  }, [editorWidth, manualHeightLocked, panelHeight, pendingConflict, state.previewOpen, state.text, windowKind]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    setScrollIndicatorOffsetY(
      getScrollIndicatorLayout({
        scrollProgress,
        viewportHeight: textarea.clientHeight,
        indicatorHeight: SCROLL_INDICATOR_HEIGHT,
        topInset: SCROLL_INDICATOR_TOP_INSET,
        bottomInset: SCROLL_INDICATOR_BOTTOM_INSET
      }).offsetY
    );
  }, [panelHeight, scrollProgress, state.text, textareaOverflowY]);

  function hydrateEditor(clipboardText: string, draft: DraftSnapshot | null) {
    const resolved = resolveEditorContent({
      clipboardText,
      draft
    });

    if (resolved.kind === "load-clipboard") {
      setState(
        createInitialSessionState({
          text: resolved.text ?? "",
          mode: settings.defaultMode,
          sourceClipboardText: resolved.text ?? ""
        })
      );
      setPendingConflict(null);
      setStatus("Loaded current clipboard text");
      return;
    }

    if (resolved.kind === "restore-draft") {
      setState(
        createInitialSessionState({
          text: resolved.text,
          mode: resolved.mode,
          sourceClipboardText: draft?.sourceClipboardText ?? clipboardText
        })
      );
      setPendingConflict(null);
      setStatus("Restored unfinished draft");
      return;
    }

    setPendingConflict(resolved);
    setStatus("Clipboard changed while a draft was open");
  }

  function persistDraft(nextState: SessionState) {
    saveDraft({
      text: nextState.text,
      sourceClipboardText: nextState.sourceClipboardText,
      dirty: true,
      mode: nextState.mode,
      updatedAt: new Date().toISOString()
    });
  }

  function updateState(nextState: SessionState) {
    setState(nextState);
    persistDraft(nextState);
  }

  function chooseConflict(choice: "draft" | "clipboard") {
    if (!pendingConflict) {
      return;
    }

    const nextState = resolveConflictChoice(pendingConflict, choice);
    setPendingConflict(null);
    updateState(nextState);
    setStatus(choice === "draft" ? "Draft restored" : "Loaded fresh clipboard text");
  }

  async function handleHide() {
    if (!isTauriRuntime() || windowKind !== "main") {
      return;
    }

    try {
      await invoke("hide_main_panel");
      setStatus("Draft hidden");
    } catch {
      setStatus("Hide failed");
    }
  }

  async function handleCopyAndHide() {
    if (windowKind !== "main") {
      return;
    }

    try {
      if (isTauriRuntime()) {
        await invoke("commit_text_and_hide", { text: state.text });
      }
      clearDraft();
      setStatus("Copied back to clipboard");
    } catch {
      setStatus("Clipboard write failed");
    }
  }

  async function saveSettingsFromDialog() {
    const normalizedHotkey = normalizeHotkey(hotkeyDraft);
    try {
      if (isTauriRuntime()) {
        await invoke("update_global_shortcut", {
          shortcut: formatHotkeyForTauri(normalizedHotkey)
        });
      }

      const nextSettings = saveSettings({
        hotkey: normalizedHotkey
      });

      setSettings(nextSettings);
      setHotkeyDraft(normalizedHotkey);
      setStatus(`Saved hotkey ${normalizedHotkey}`);

      if (windowKind === "settings") {
        await closeSettingsWindow();
      }
    } catch {
      setStatus(`Failed to register hotkey ${normalizedHotkey}`);
    }
  }

  async function closeSettingsWindow() {
    if (!isTauriRuntime() || windowKind !== "settings") {
      return;
    }

    try {
      await invoke("close_settings_window");
    } catch {
      setStatus("Unable to close settings");
    }
  }

  async function startPanelResize(direction: PanelResizeDirection) {
    if (!isTauriRuntime() || windowKind !== "main") {
      return;
    }

    try {
      setManualHeightLocked(true);
      await invoke("set_main_panel_resize_state", { resizing: true });
      await getCurrentWindow().startResizeDragging(direction);
    } catch {
      setStatus("Resize unavailable");
    }
  }

  async function switchEditorMode(mode: EditorMode) {
    if (windowKind !== "main") {
      return;
    }

    const nextState = changeMode(state, mode);

    updateState(nextState);
    const nextSettings = saveSettings({ defaultMode: mode });
    setSettings(nextSettings);
  }

  async function togglePreviewWindow() {
    if (windowKind !== "main" || state.mode !== "markdown") {
      return;
    }

    if (!state.previewOpen) {
      const measuredEditorWidth = Math.round(panelRef.current?.getBoundingClientRect().width ?? editorWidth);
      setEditorWidth(Math.max(measuredEditorWidth, PANEL_MIN_WIDTH));
    }

    updateState(
      applySessionAction(state, {
        type: "preview-toggled"
      })
    );
    setStatus(state.previewOpen ? "Closed markdown preview" : "Opened markdown preview");
  }

  if (windowKind === "settings") {
    return (
      <main className="settings-shell">
        <section className="panel settings-window-panel">
          <header className="settings-titlebar">
            <div className="settings-titlecopy" data-tauri-drag-region>
              <p className="eyebrow">Anywhere</p>
              <strong>Settings</strong>
            </div>
            <button
              aria-label="Close settings"
              className="settings-close"
              onClick={() => void closeSettingsWindow()}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              ×
            </button>
          </header>

          <section className="settings-content" aria-label="Settings">
            <div className="settings-copy">
              <h1>Global hotkey</h1>
              <p>Click the field below, then press the shortcut you want to use.</p>
            </div>

            <label className="settings-field">
              <span>Recorded shortcut</span>
              <input
                className="settings-input"
                onChange={() => undefined}
                onFocus={() => setStatus("Press a shortcut combination")}
                onKeyDown={(event) => {
                  event.preventDefault();
                  const nextHotkey = captureHotkeyFromEvent(event);
                  if (nextHotkey) {
                    setHotkeyDraft(nextHotkey);
                  }
                }}
                placeholder="Press keys..."
                value={hotkeyDraft}
              />
            </label>

            <div className="footer-actions settings-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setHotkeyDraft(settings.hotkey);
                  void closeSettingsWindow();
                }}
                type="button"
              >
                Cancel
              </button>
              <button className="primary-button" onClick={() => void saveSettingsFromDialog()} type="button">
                Save Settings
              </button>
            </div>

            <p className="settings-note">{status}</p>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="panel-frame">
      <section className={`workspace-frame ${state.previewOpen ? "with-preview" : ""}`}>
        {state.previewOpen ? (
          <aside className="preview-dock" aria-label="Markdown preview">
            <div className="preview-dock-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </aside>
        ) : null}
        <section
          ref={panelRef}
          className={`panel panel-shell main-window-panel ${isPanelCapped ? "is-capped" : ""}`}
          style={{ height: `${Math.max(panelHeight, PANEL_DEFAULT_HEIGHT)}px` }}
        >
          {PANEL_RESIZE_DIRECTIONS.map((direction) => (
            <button
              aria-hidden="true"
              className={`resize-handle resize-${direction.toLowerCase()}`}
              key={direction}
              onPointerDown={(event) => {
                event.preventDefault();
                void startPanelResize(direction);
              }}
              tabIndex={-1}
              type="button"
            />
          ))}
          <header className="panel-strip">
            <div className="panel-toolbar">
              <div className="segmented-control compact-control" role="tablist" aria-label="Editor mode">
                <button
                  className={state.mode === "plain-text" ? "active" : ""}
                  onClick={() => void switchEditorMode("plain-text")}
                  type="button"
                >
                  Plain Text
                </button>
                <button
                  className={state.mode === "markdown" ? "active" : ""}
                  onClick={() => void switchEditorMode("markdown")}
                  type="button"
                >
                  Markdown
                </button>
              </div>
              {state.mode === "markdown" ? (
                  <button
                    className={`preview-toggle ${state.previewOpen ? "active" : ""}`}
                    onClick={() => void togglePreviewWindow()}
                    type="button"
                  >
                    Preview
                  </button>
                ) : null}
            </div>
            <p className="panel-status" aria-live="polite">
              {status}
            </p>
          </header>

          <section className={`editor-layout panel-editor ${isPanelCapped ? "is-capped" : ""} ${pendingConflict ? "has-conflict" : ""}`}>
            {pendingConflict ? (
              <section className="conflict-banner" aria-live="polite">
                <div>
                  <strong>Clipboard changed</strong>
                  <p>Choose whether to keep your unfinished draft or replace it with the new clipboard text.</p>
                </div>
                <div className="footer-actions">
                  <button className="secondary-button" onClick={() => chooseConflict("clipboard")} type="button">
                    Load Clipboard
                  </button>
                  <button className="primary-button" onClick={() => chooseConflict("draft")} type="button">
                    Restore Draft
                  </button>
                </div>
              </section>
            ) : null}

            <label ref={editorSurfaceRef} className={`editor-surface ${isPanelCapped ? "is-scrollable" : ""}`}>
              <span className="visually-hidden">Editor</span>
              <textarea
                placeholder={EDITOR_HINT}
                style={
                  textareaHeight === null
                    ? { overflowY: textareaOverflowY }
                    : { height: `${textareaHeight}px`, overflowY: textareaOverflowY }
                }
                onKeyDown={(event) => {
                  const action = getPanelShortcutAction(event);

                  if (action === "copy-and-hide") {
                    event.preventDefault();
                    void handleCopyAndHide();
                  }

                  if (action === "hide") {
                    event.preventDefault();
                    void handleHide();
                  }
                }}
                onScroll={(event) => {
                  const element = event.currentTarget;
                  const maxScroll = element.scrollHeight - element.clientHeight;
                  setScrollProgress(maxScroll > 0 ? element.scrollTop / maxScroll : 0);
                  handleScrollIndicator();
                }}
                ref={textareaRef}
                onChange={(event) =>
                  updateState(
                    applySessionAction(state, {
                      type: "text-changed",
                      text: event.target.value
                    })
                  )
                }
                spellCheck={state.mode === "plain-text"}
                value={state.text}
              />
              <span
                aria-hidden="true"
                className={`scroll-indicator ${showScrollIndicator ? "visible" : ""}`}
                style={{ transform: `translateY(${scrollIndicatorOffsetY}px)` }}
              />
            </label>
          </section>
        </section>
      </section>
    </main>
  );
}
