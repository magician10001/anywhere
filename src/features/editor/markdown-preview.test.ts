import { describe, expect, it } from "vitest";
import { renderMarkdownPreview } from "./markdown-preview";

describe("renderMarkdownPreview", () => {
  it("renders github-flavored markdown tables", () => {
    const html = renderMarkdownPreview(`
| Name | Value |
| --- | --- |
| Alpha | 1 |
| Beta | 2 |
`.trim());

    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).toContain("<td>Alpha</td>");
  });
});
