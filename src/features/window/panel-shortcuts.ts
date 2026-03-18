export type PanelShortcutAction = "copy-and-hide" | "hide" | "none";

export function getPanelShortcutAction(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
}): PanelShortcutAction {
  if (event.key === "Escape") {
    return "hide";
  }

  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    return "copy-and-hide";
  }

  return "none";
}
