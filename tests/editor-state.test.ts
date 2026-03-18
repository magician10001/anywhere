import { describe, expect, it } from "vitest";
import {
  applySessionAction,
  createInitialSessionState,
  resolveConflictChoice,
  resolveEditorContent,
  type DraftSnapshot
} from "../src/features/editor/editor-state";
import { clearDraft, loadDraft, saveDraft } from "../src/features/editor/draft-storage";

describe("resolveEditorContent", () => {
  it("loads clipboard text when there is no draft", () => {
    expect(resolveEditorContent({ clipboardText: "copied text", draft: null })).toEqual({
      kind: "load-clipboard",
      text: "copied text"
    });
  });

  it("restores draft when clipboard text is unchanged", () => {
    const draft: DraftSnapshot = {
      text: "copied text revised",
      sourceClipboardText: "copied text",
      dirty: true,
      mode: "markdown",
      updatedAt: "2026-03-17T00:00:00.000Z"
    };

    expect(resolveEditorContent({ clipboardText: "copied text", draft })).toEqual({
      kind: "restore-draft",
      text: "copied text revised",
      mode: "markdown"
    });
  });

  it("returns conflict state when clipboard text changed while draft is dirty", () => {
    const draft: DraftSnapshot = {
      text: "draft version",
      sourceClipboardText: "original clipboard",
      dirty: true,
      mode: "plain-text",
      updatedAt: "2026-03-17T00:00:00.000Z"
    };

    expect(resolveEditorContent({ clipboardText: "new clipboard", draft })).toEqual({
      kind: "conflict",
      draftText: "draft version",
      clipboardText: "new clipboard",
      mode: "plain-text",
      sourceClipboardText: "original clipboard"
    });
  });

  it("keeps the text intact when changing editor mode", () => {
    const initial = createInitialSessionState({
      text: "hello **world**",
      mode: "plain-text"
    });

    expect(
      applySessionAction(initial, {
        type: "mode-changed",
        mode: "markdown"
      })
    ).toMatchObject({
      text: "hello **world**",
      mode: "markdown"
    });
  });

  it("starts with preview disabled", () => {
    expect(createInitialSessionState({ text: "", mode: "plain-text" }).previewOpen).toBe(false);
  });

  it("tracks the source clipboard text separately from edited text", () => {
    const initial = createInitialSessionState({
      text: "clipboard text",
      mode: "plain-text",
      sourceClipboardText: "clipboard text"
    });

    expect(
      applySessionAction(initial, {
        type: "text-changed",
        text: "edited text"
      })
    ).toMatchObject({
      text: "edited text",
      sourceClipboardText: "clipboard text"
    });
  });

  it("restores the draft when resolving a conflict in favor of the draft", () => {
    expect(
      resolveConflictChoice(
        {
          kind: "conflict",
          draftText: "draft version",
          clipboardText: "new clipboard",
          mode: "markdown",
          sourceClipboardText: "old clipboard"
        },
        "draft"
      )
    ).toMatchObject({
      text: "draft version",
      mode: "markdown",
      sourceClipboardText: "old clipboard"
    });
  });

  it("loads the fresh clipboard when resolving a conflict in favor of the clipboard", () => {
    expect(
      resolveConflictChoice(
        {
          kind: "conflict",
          draftText: "draft version",
          clipboardText: "new clipboard",
          mode: "markdown",
          sourceClipboardText: "old clipboard"
        },
        "clipboard"
      )
    ).toMatchObject({
      text: "new clipboard",
      mode: "markdown",
      sourceClipboardText: "new clipboard"
    });
  });
});

describe("draft storage", () => {
  it("round-trips a draft snapshot through local storage", () => {
    const draft: DraftSnapshot = {
      text: "draft version",
      sourceClipboardText: "clipboard source",
      dirty: true,
      mode: "markdown",
      updatedAt: "2026-03-17T00:00:00.000Z"
    };

    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
  });

  it("clears the saved draft", () => {
    saveDraft({
      text: "draft version",
      sourceClipboardText: "clipboard source",
      dirty: true,
      mode: "markdown",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });

    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});
