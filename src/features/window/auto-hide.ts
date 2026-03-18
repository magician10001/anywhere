export function shouldAutoHideOnBlur({
  windowKind,
  suppressAutoHide
}: {
  windowKind: "main" | "settings";
  suppressAutoHide: boolean;
}) {
  return windowKind === "main" && !suppressAutoHide;
}
