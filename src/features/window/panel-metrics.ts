export type PanelSize = {
  width: number;
  height: number;
};

export type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PanelMargins = {
  right: number;
  bottom: number;
};

export type EditorLayout = {
  panelHeight: number;
  textareaHeight: number | null;
  capped: boolean;
  overflowY: "hidden" | "auto";
};

export type ScrollIndicatorLayout = {
  offsetY: number;
};

export const PANEL_DEFAULT_WIDTH = 560;
export const PANEL_DEFAULT_HEIGHT = 360;
export const PANEL_MIN_WIDTH = 460;
export const PANEL_MIN_HEIGHT = 300;
export const PANEL_MAX_HEIGHT = 640;
export const PANEL_MARGINS: PanelMargins = {
  right: 20,
  bottom: 20
};

export function clampPanelHeight(value: number, limits: { min: number; max: number }): number {
  return Math.min(limits.max, Math.max(limits.min, value));
}

export function getEditorLayout(input: {
  currentPanelHeight: number;
  editorScrollHeight: number;
  chromeHeight: number;
  minPanelHeight: number;
  maxPanelHeight: number;
  manualHeightLocked?: boolean;
}): EditorLayout {
  const requestedPanelHeight = input.editorScrollHeight + input.chromeHeight;
  const panelHeight = clampPanelHeight(
    input.manualHeightLocked ? input.currentPanelHeight : Math.max(input.currentPanelHeight, requestedPanelHeight),
    {
      min: input.minPanelHeight,
      max: input.maxPanelHeight
    }
  );
  const textareaHeight = Math.max(panelHeight - input.chromeHeight, 0);
  const capped = requestedPanelHeight > panelHeight;

  return {
    panelHeight,
    textareaHeight: capped ? null : textareaHeight,
    capped,
    overflowY: capped ? "auto" : "hidden"
  };
}

export function getPanelAnchor(workArea: PanelRect, panel: PanelSize, margins: PanelMargins) {
  return {
    x: workArea.x + workArea.width - panel.width - margins.right,
    y: workArea.y + workArea.height - panel.height - margins.bottom
  };
}

export function getScrollIndicatorLayout(input: {
  scrollProgress: number;
  viewportHeight: number;
  indicatorHeight: number;
  topInset: number;
  bottomInset: number;
}): ScrollIndicatorLayout {
  const travel = Math.max(input.viewportHeight - input.indicatorHeight - input.topInset - input.bottomInset, 0);

  return {
    offsetY: input.topInset + travel * input.scrollProgress
  };
}
