import { describe, expect, it } from "vitest";
import { getPanelShortcutAction } from "./panel-shortcuts";

describe("getPanelShortcutAction", () => {
  it("maps Ctrl+Enter to copy-and-hide", () => {
    expect(
      getPanelShortcutAction({
        key: "Enter",
        ctrlKey: true,
        metaKey: false
      })
    ).toBe("copy-and-hide");
  });

  it("maps Escape to hide", () => {
    expect(
      getPanelShortcutAction({
        key: "Escape",
        ctrlKey: false,
        metaKey: false
      })
    ).toBe("hide");
  });

  it("ignores unrelated keys", () => {
    expect(
      getPanelShortcutAction({
        key: "a",
        ctrlKey: false,
        metaKey: false
      })
    ).toBe("none");
  });
});
