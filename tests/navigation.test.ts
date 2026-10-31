import { describe, expect, it } from "vitest";
import { buildReaderNavigation, findParagraphIndex } from "../src/core/navigation";
import type { ImportedDocument } from "../src/core/pdf";

function makeDocument(paragraphs: string[]): ImportedDocument {
  const words = paragraphs.flatMap(text => text.trim().split(/\s+/u).filter(Boolean));
  return {
    name: "teste.pdf",
    words,
    pages: words.map(() => 1),
    pageStarts: [0],
    pageTexts: paragraphs,
    paragraphs
  };
}

describe("reader navigation", () => {
  it("creates a beginning section and detects chapter headings", () => {
    const result = buildReaderNavigation(makeDocument([
      "Texto introdutório com algumas palavras.",
      "CAPÍTULO 1",
      "Conteúdo do primeiro capítulo."
    ]));
    expect(result.sections.map(section => section.title)).toEqual([
      "Início do documento", "CAPÍTULO 1"
    ]);
    expect(result.sections[1].wordIndex).toBe(5);
  });

  it("maps word positions to their paragraphs", () => {
    const result = buildReaderNavigation(makeDocument([
      "Um dois três",
      "Quatro cinco",
      "Seis sete oito"
    ]));
    expect(findParagraphIndex(result.paragraphs, 0)).toBe(0);
    expect(findParagraphIndex(result.paragraphs, 3)).toBe(1);
    expect(findParagraphIndex(result.paragraphs, 7)).toBe(2);
  });

  it("returns a safe index for positions outside the text", () => {
    const result = buildReaderNavigation(makeDocument(["um dois", "três quatro"]));
    expect(findParagraphIndex(result.paragraphs, 99)).toBe(1);
    expect(findParagraphIndex(result.paragraphs, -1)).toBe(0);
  });

  it("handles an empty document without throwing", () => {
    const result = buildReaderNavigation(makeDocument([]));
    expect(result.paragraphs).toHaveLength(0);
    expect(findParagraphIndex(result.paragraphs, 0)).toBe(0);
  });
});
