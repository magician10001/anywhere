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

export function getPanelAnchor(workArea: PanelRect, panel: PanelSize, margins: PanelMargins) {
  return {
    x: workArea.x + workArea.width - panel.width - margins.right,
    y: workArea.y + workArea.height - panel.height - margins.bottom
  };
}
