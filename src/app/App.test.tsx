import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App";

const SETTINGS_STORAGE_KEY = "quick-text-panel/settings";

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("App main panel", () => {
  it("keeps the main panel editor-first", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).not.toContain("<h1>Clipboard scratchpad</h1>");
    expect(markup).not.toContain('<p class="eyebrow">Anywhere</p>');
    expect(markup).not.toContain("Settings");
    expect(markup).toContain("Plain Text");
    expect(markup).toContain("Markdown");
    expect(markup).toContain("textarea");
  });

  it("shows the editor hint instead of seeding default sample text", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('placeholder="Paste or type here, then press Ctrl+Enter to copy back and hide."');
    expect(markup).not.toContain("Paste or type here, then press Ctrl+Enter to copy back and hide.</textarea>");
    expect(markup).not.toContain("# Anywhere");
  });

  it("shows a preview toggle when markdown is the active mode", () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        hotkey: "Ctrl+Shift+Space",
        defaultMode: "markdown",
        previewEnabledByDefault: false
      })
    );

    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Preview");
  });
});
