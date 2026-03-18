import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("panel shell styling", () => {
  it("clips inner layers to the panel radius", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/app.css"), "utf8");
    const appSource = readFileSync(resolve(process.cwd(), "src/app/App.tsx"), "utf8");

    expect(css).toContain(".panel {");
    expect(css).toContain("overflow: hidden;");
    expect(css).toContain("border-radius: inherit;");
    expect(css).toContain(".main-window-panel {");
    expect(css).toContain("border-radius: 0;");
    expect(css).toContain("box-shadow: none;");
    expect(css).toContain(".main-window-panel.is-capped {");
    expect(css).toContain("flex-direction: column;");
    expect(css).toContain(".panel-editor.is-capped {");
    expect(css).toContain("display: flex;");
    expect(css).toContain(".editor-surface.is-scrollable {");
    expect(css).toContain("display: flex;");
    expect(css).toContain(".editor-surface.is-scrollable textarea {");
    expect(css).toContain("flex: 1 1 auto;");
    expect(css).toContain(".workspace-frame.with-preview {");
    expect(css).toContain("grid-template-columns: 420px minmax(0, 1fr);");
    expect(css).toContain(".panel-frame {\n  width: 100%;\n  height: 100vh;\n  padding: 0;\n  background: #eef2f7;");
    expect(appSource).toContain("workspace-frame");
    expect(appSource).toContain("preview-dock");
  });

  it("does not apply the narrow mobile layout to the default desktop panel width", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/app.css"), "utf8");

    expect(css).toContain("@media (max-width: 520px)");
    expect(css).not.toContain("@media (max-width: 900px)");
  });

  it("gives the settings window its own full-size layout shell", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/app.css"), "utf8");

    expect(css).toContain(".settings-shell {");
    expect(css).toContain("display: flex;");
    expect(css).toContain(".settings-window-panel {");
  });

  it("uses a custom settings titlebar and simplified content layout", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/app.css"), "utf8");
    const appSource = readFileSync(resolve(process.cwd(), "src/app/App.tsx"), "utf8");

    expect(css).toContain(".settings-titlebar {");
    expect(css).toContain(".settings-content {");
    expect(css).toContain(".settings-close {");
    expect(css).toContain(".settings-shell {\n  width: 100%;\n  min-height: 100vh;\n  padding: 0;");
    expect(css).toContain("justify-content: center;");
    expect(css).toContain("align-items: center;");
    expect(appSource).toContain('invoke("close_settings_window")');
    expect(appSource).toContain("data-tauri-drag-region");
    expect(appSource).toContain("settings-titlebar");
    expect(appSource).toContain("settings-content");
  });

  it("keeps the main tauri window opaque so resized corners do not reveal transparency", () => {
    const tauriConfig = readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8");

    expect(tauriConfig).toContain('"label": "main"');
    expect(tauriConfig).toContain('"transparent": false');
    expect(tauriConfig).toContain('"shadow": true');
    expect(tauriConfig).not.toContain('"transparent": true');
  });
});
