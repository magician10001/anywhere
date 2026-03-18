import { describe, expect, it } from "vitest";
import {
  clampPanelHeight,
  getPanelAnchor,
  PANEL_DEFAULT_HEIGHT,
  PANEL_DEFAULT_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH
} from "./panel-metrics";

describe("panel defaults", () => {
  it("starts with a roomier default size than the previous compact shell", () => {
    expect(PANEL_DEFAULT_WIDTH).toBe(560);
    expect(PANEL_DEFAULT_HEIGHT).toBe(360);
    expect(PANEL_MIN_WIDTH).toBe(460);
    expect(PANEL_MIN_HEIGHT).toBe(300);
  });
});

describe("clampPanelHeight", () => {
  it("caps panel height at the configured maximum", () => {
    expect(clampPanelHeight(900, { min: 300, max: 640 })).toBe(640);
  });

  it("never shrinks below the configured minimum", () => {
    expect(clampPanelHeight(180, { min: 300, max: 640 })).toBe(300);
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
