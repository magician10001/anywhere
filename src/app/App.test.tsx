import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App";

afterEach(() => {
  window.localStorage.clear();
});

describe("App main panel", () => {
  it("keeps the main panel editor-first", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).not.toContain("<h1>Clipboard scratchpad</h1>");
    expect(markup).not.toContain('<p class="eyebrow">Quick Text Panel</p>');
    expect(markup).not.toContain("Settings");
    expect(markup).toContain("Plain Text");
    expect(markup).toContain("Markdown");
    expect(markup).toContain("textarea");
  });
});
