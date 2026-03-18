import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true
});

export function renderMarkdownPreview(markdown: string): string {
  return marked.parse(markdown, { async: false });
}
