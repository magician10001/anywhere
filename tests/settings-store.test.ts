import { afterEach, describe, expect, it } from "vitest";
import {
  captureHotkeyFromEvent,
  defaultSettings,
  formatHotkeyForTauri,
  loadSettings,
  normalizeHotkey,
  saveSettings
} from "../src/features/settings/settings-store";

afterEach(() => {
  window.localStorage.clear();
});

describe("normalizeHotkey", () => {
  it("orders modifiers before the main key", () => {
    expect(normalizeHotkey("Space+Shift+Ctrl")).toBe("Ctrl+Shift+Space");
  });

  it("converts the saved hotkey to the format expected by Tauri shortcuts", () => {
    expect(formatHotkeyForTauri("Ctrl+Shift+Space")).toBe("CommandOrControl+Shift+Space");
  });

  it("captures a keyboard chord into the saved hotkey format", () => {
    expect(
      captureHotkeyFromEvent({
        key: " ",
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        metaKey: false
      })
    ).toBe("Ctrl+Shift+Space");
  });

  it("ignores modifier-only key presses while recording", () => {
    expect(
      captureHotkeyFromEvent({
        key: "Control",
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false
      })
    ).toBe("");
  });
});

describe("settings persistence", () => {
  it("returns defaults when nothing is saved", () => {
    expect(loadSettings()).toEqual(defaultSettings);
  });

  it("persists partial updates on top of defaults", () => {
    saveSettings({
      hotkey: "Ctrl+Alt+Space",
      defaultMode: "markdown"
    });

    expect(loadSettings()).toEqual({
      ...defaultSettings,
      hotkey: "Ctrl+Alt+Space",
      defaultMode: "markdown"
    });
  });
});
