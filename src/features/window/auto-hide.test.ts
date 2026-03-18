import { describe, expect, it } from "vitest";
import { shouldAutoHideOnBlur } from "./auto-hide";

describe("shouldAutoHideOnBlur", () => {
  it("auto-hides the main panel when blur is not suppressed", () => {
    expect(shouldAutoHideOnBlur({ windowKind: "main", suppressAutoHide: false })).toBe(true);
  });

  it("does not auto-hide the settings window", () => {
    expect(shouldAutoHideOnBlur({ windowKind: "settings", suppressAutoHide: false })).toBe(false);
  });

  it("does not auto-hide when blur handling is temporarily suppressed", () => {
    expect(shouldAutoHideOnBlur({ windowKind: "main", suppressAutoHide: true })).toBe(false);
  });
});
