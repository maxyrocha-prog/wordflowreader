import { describe, expect, it } from "vitest";
import { indexPdfPages } from "../src/core/pdf-index";

describe("PDF page indexing", () => {
  it("assigns one-based page numbers to every extracted word", () => {
    const result = indexPdfPages(["Um dois", "Três quatro cinco"]);
    expect(result.words).toEqual(["Um", "dois", "Três", "quatro", "cinco"]);
    expect(result.pages).toEqual([1, 1, 2, 2, 2]);
  });

  it("records the first word index for each page, including empty pages", () => {
    const result = indexPdfPages(["Um dois", "", "Três"]);
    expect(result.pageStarts).toEqual([0, 2, 2]);
  });

  it("normalizes line breaks inside paragraphs and preserves paragraph boundaries", () => {
    const result = indexPdfPages(["Primeira linha\ncontinua.\n\nSegundo parágrafo."]);
    expect(result.paragraphs).toEqual([
      "Primeira linha continua.",
      "Segundo parágrafo."
    ]);
  });

  it("indexes a large page without losing words or page references", () => {
    const largePage = Array.from({ length: 12_000 }, (_, index) => `palavra${index}`).join(" ");
    const result = indexPdfPages([largePage]);

    expect(result.words).toHaveLength(12_000);
    expect(result.words[0]).toBe("palavra0");
    expect(result.words[11_999]).toBe("palavra11999");
    expect(result.pages).toHaveLength(12_000);
    expect(result.pages.every(page => page === 1)).toBe(true);
  });

  it("handles empty pages and whitespace without creating phantom words", () => {
    const result = indexPdfPages(["  \n ", "Texto   com espaços"]);
    expect(result.words).toEqual(["Texto", "com", "espaços"]);
    expect(result.pages).toEqual([2, 2, 2]);
    expect(result.paragraphs).toEqual(["Texto com espaços"]);
  });
});
