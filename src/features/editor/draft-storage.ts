import type { DraftSnapshot } from "./editor-state";

const DRAFT_STORAGE_KEY = "quick-text-panel/draft";

export function loadDraft(): DraftSnapshot | null {
  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DraftSnapshot;
  } catch {
    return null;
  }
}

export function saveDraft(draft: DraftSnapshot): void {
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}
