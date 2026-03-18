import type { EditorMode } from "../editor/editor-state";

const MODIFIER_ORDER = ["Ctrl", "Shift", "Alt", "Meta"] as const;
const SETTINGS_STORAGE_KEY = "quick-text-panel/settings";

export type AppSettings = {
  hotkey: string;
  defaultMode: EditorMode;
  previewEnabledByDefault: boolean;
};

type HotkeyEventLike = {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

export const defaultSettings: AppSettings = {
  hotkey: "Ctrl+Shift+Space",
  defaultMode: "plain-text",
  previewEnabledByDefault: false
};

function normalizeToken(token: string): string {
  const trimmed = token.trim();
  const lowered = trimmed.toLowerCase();

  switch (lowered) {
    case "control":
    case "ctrl":
      return "Ctrl";
    case "shift":
      return "Shift";
    case "alt":
      return "Alt";
    case "meta":
    case "win":
    case "cmd":
      return "Meta";
    case "space":
      return "Space";
    default:
      return trimmed.length <= 1
        ? trimmed.toUpperCase()
        : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
}

export function normalizeHotkey(value: string): string {
  const tokens = value
    .split("+")
    .map(normalizeToken)
    .filter(Boolean);

  const modifiers = MODIFIER_ORDER.filter((modifier) => tokens.includes(modifier));
  const mainKeys = tokens.filter((token) => !MODIFIER_ORDER.includes(token as (typeof MODIFIER_ORDER)[number]));

  return [...modifiers, ...mainKeys].join("+");
}

export function formatHotkeyForTauri(value: string): string {
  return normalizeHotkey(value)
    .split("+")
    .map((token) => (token === "Ctrl" ? "CommandOrControl" : token))
    .join("+");
}

export function captureHotkeyFromEvent(event: HotkeyEventLike): string {
  const key = normalizeToken(event.key === " " ? "Space" : event.key);
  const modifierOnly = MODIFIER_ORDER.includes(key as (typeof MODIFIER_ORDER)[number]);

  if (modifierOnly) {
    return "";
  }

  const tokens = [
    event.ctrlKey ? "Ctrl" : "",
    event.shiftKey ? "Shift" : "",
    event.altKey ? "Alt" : "",
    event.metaKey ? "Meta" : "",
    key
  ].filter(Boolean);

  return normalizeHotkey(tokens.join("+"));
}

export function loadSettings(): AppSettings {
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...defaultSettings,
      ...parsed
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(nextSettings: Partial<AppSettings>): AppSettings {
  const merged = {
    ...loadSettings(),
    ...nextSettings
  };

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
