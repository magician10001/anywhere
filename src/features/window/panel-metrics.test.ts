import { describe, expect, it } from "vitest";
import {
  clampPanelHeight,
  getEditorLayout,
  getPanelAnchor,
  getScrollIndicatorLayout,
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

describe("getEditorLayout", () => {
  it("keeps the editor growing with content before the panel reaches its height cap", () => {
    expect(
      getEditorLayout({
        currentPanelHeight: 360,
        editorScrollHeight: 260,
        chromeHeight: 56,
        minPanelHeight: 300,
        maxPanelHeight: 640,
        manualHeightLocked: false
      })
    ).toEqual({
      panelHeight: 360,
      textareaHeight: 304,
      capped: false,
      overflowY: "hidden"
    });
  });

  it("keeps a manually enlarged panel height and lets the editor fill the extra space", () => {
    expect(
      getEditorLayout({
        currentPanelHeight: 520,
        editorScrollHeight: 260,
        chromeHeight: 56,
        minPanelHeight: 300,
        maxPanelHeight: 640,
        manualHeightLocked: true
      })
    ).toEqual({
      panelHeight: 520,
      textareaHeight: 464,
      capped: false,
      overflowY: "hidden"
    });
  });

  it("caps the panel height and enables internal scrolling for taller content", () => {
    expect(
      getEditorLayout({
        currentPanelHeight: 520,
        editorScrollHeight: 900,
        chromeHeight: 56,
        minPanelHeight: 300,
        maxPanelHeight: 640,
        manualHeightLocked: true
      })
    ).toEqual({
      panelHeight: 520,
      textareaHeight: null,
      capped: true,
      overflowY: "auto"
    });
  });

  it("auto-grows up to the max height before switching to internal scrolling", () => {
    expect(
      getEditorLayout({
        currentPanelHeight: 360,
        editorScrollHeight: 900,
        chromeHeight: 56,
        minPanelHeight: 300,
        maxPanelHeight: 640,
        manualHeightLocked: false
      })
    ).toEqual({
      panelHeight: 640,
      textareaHeight: null,
      capped: true,
      overflowY: "auto"
    });
  });
});

describe("getScrollIndicatorLayout", () => {
  it("starts near the top inset when scroll is at the beginning", () => {
    expect(
      getScrollIndicatorLayout({
        scrollProgress: 0,
        viewportHeight: 240,
        indicatorHeight: 38,
        topInset: 12,
        bottomInset: 12
      })
    ).toEqual({ offsetY: 12 });
  });

  it("moves the indicator to the bottom of the editor track at max scroll", () => {
    expect(
      getScrollIndicatorLayout({
        scrollProgress: 1,
        viewportHeight: 240,
        indicatorHeight: 38,
        topInset: 12,
        bottomInset: 12
      })
    ).toEqual({ offsetY: 190 });
  });
});
