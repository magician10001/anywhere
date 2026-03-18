import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("application icon assets", () => {
  it("keeps generated desktop icon files alongside the tauri bundle config", () => {
    const tauriConfig = readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8");

    expect(existsSync(resolve(process.cwd(), "src-tauri/icons/icon.ico"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "src-tauri/icons/128x128.png"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "src-tauri/icons/128x128@2x.png"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "src-tauri/icons/icon.icns"))).toBe(true);
    expect(tauriConfig).toContain('"icons/32x32.png"');
    expect(tauriConfig).toContain('"icons/128x128.png"');
    expect(tauriConfig).toContain('"icons/128x128@2x.png"');
    expect(tauriConfig).toContain('"icons/icon.icns"');
    expect(tauriConfig).toContain('"icons/icon.ico"');
  });
});
