export type EditorMode = "plain-text" | "markdown";

export type DraftSnapshot = {
  text: string;
  sourceClipboardText: string;
  dirty: boolean;
  mode: EditorMode;
  updatedAt: string;
};

export type SessionState = {
  text: string;
  mode: EditorMode;
  previewOpen: boolean;
  sourceClipboardText: string;
};

export type SessionAction =
  | { type: "text-changed"; text: string }
  | { type: "mode-changed"; mode: EditorMode }
  | { type: "preview-toggled" };

type ResolveEditorInput = {
  clipboardText: string;
  draft: DraftSnapshot | null;
};

type LoadClipboardResult = {
  kind: "load-clipboard";
  text: string;
};

type RestoreDraftResult = {
  kind: "restore-draft";
  text: string;
  mode: EditorMode;
};

type ConflictResult = {
  kind: "conflict";
  draftText: string;
  clipboardText: string;
  mode: EditorMode;
  sourceClipboardText: string;
};

export type ResolveEditorResult =
  | LoadClipboardResult
  | RestoreDraftResult
  | ConflictResult;

export function createInitialSessionState({
  text,
  mode,
  sourceClipboardText
}: {
  text: string;
  mode: EditorMode;
  sourceClipboardText?: string;
}): SessionState {
  return {
    text,
    mode,
    previewOpen: false,
    sourceClipboardText: sourceClipboardText ?? text
  };
}

export function applySessionAction(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case "text-changed":
      return {
        ...state,
        text: action.text
      };
    case "mode-changed":
      return {
        ...state,
        mode: action.mode,
        previewOpen: action.mode === "markdown" ? state.previewOpen : false
      };
    case "preview-toggled":
      if (state.mode !== "markdown") {
        return state;
      }

      return {
        ...state,
        previewOpen: !state.previewOpen
      };
    default:
      return state;
  }
}

export function resolveEditorContent({
  clipboardText,
  draft
}: ResolveEditorInput): ResolveEditorResult {
  if (!draft || !draft.dirty) {
    return {
      kind: "load-clipboard",
      text: clipboardText
    };
  }

  if (draft.sourceClipboardText === clipboardText) {
    return {
      kind: "restore-draft",
      text: draft.text,
      mode: draft.mode
    };
  }

  return {
    kind: "conflict",
    draftText: draft.text,
    clipboardText,
    mode: draft.mode,
    sourceClipboardText: draft.sourceClipboardText
  };
}

export function resolveConflictChoice(
  conflict: ConflictResult,
  choice: "draft" | "clipboard"
): SessionState {
  if (choice === "draft") {
    return createInitialSessionState({
      text: conflict.draftText,
      mode: conflict.mode,
      sourceClipboardText: conflict.sourceClipboardText
    });
  }

  return createInitialSessionState({
    text: conflict.clipboardText,
    mode: conflict.mode,
    sourceClipboardText: conflict.clipboardText
  });
}
