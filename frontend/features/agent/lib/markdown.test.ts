import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "./markdown";

describe("normalizeMarkdown", () => {
  it("converts HTML breaks to Markdown hard breaks", () => {
    expect(normalizeMarkdown("a<br>b")).toBe("a  \nb");
    expect(normalizeMarkdown("a<BR/>b")).toBe("a  \nb");
    expect(normalizeMarkdown("a<br />b")).toBe("a  \nb");
  });

  it("splits single-line tables into one row per line", () => {
    const flat = "| Area | Files ||---|---|---|| Editor | `src/a.ts` | top |";
    const out = normalizeMarkdown(flat);
    const rows = out.split("\n");
    expect(rows.length).toBe(3);
    expect(rows[1]).toMatch(/^\|.*\|$/);
    expect(rows[1]).toContain("---");
  });

  it("leaves normal paragraphs untouched", () => {
    const text = "Hello world, nothing | special here.";
    expect(normalizeMarkdown(text)).toBe(text);
  });

  it("handles empty input", () => {
    expect(normalizeMarkdown("")).toBe("");
  });
});
