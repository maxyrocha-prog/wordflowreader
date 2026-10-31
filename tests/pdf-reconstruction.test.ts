import { describe, expect, it } from "vitest";
import { reconstructPageText } from "../src/core/pdf";

function item(str: string, x: number, y: number, options: { width?: number; hasEOL?: boolean } = {}) {
  return {
    str,
    transform: [10, 0, 0, 10, x, y],
    width: options.width ?? str.length * 5,
    height: 10,
    hasEOL: options.hasEOL ?? false
  };
}

describe("PDF page text reconstruction", () => {
  it("joins text fragments on the same line with appropriate spaces", () => {
    expect(reconstructPageText([
      item("Bom", 0, 100),
      item("dia", 20, 100)
    ])).toBe("Bom dia");
  });

  it("preserves line breaks based on vertical position", () => {
    expect(reconstructPageText([
      item("Primeira linha", 0, 100),
      item("Segunda linha", 0, 90)
    ])).toBe("Primeira linha\nSegunda linha");
  });

  it("separates paragraphs when the vertical gap is larger", () => {
    expect(reconstructPageText([
      item("Primeiro parágrafo.", 0, 100),
      item("Segundo parágrafo.", 0, 80)
    ])).toBe("Primeiro parágrafo.\n\nSegundo parágrafo.");
  });

  it("respects explicit end-of-line markers", () => {
    expect(reconstructPageText([
      item("Linha um", 0, 100, { hasEOL: true }),
      item("Linha dois", 0, 100)
    ])).toBe("Linha um\nLinha dois");
  });

  it("ignores invalid items and normalizes excess whitespace", () => {
    expect(reconstructPageText([
      null,
      { str: "inválido" },
      item("  Texto", 0, 100),
      item("   final  ", 45, 100)
    ])).toBe("Texto final");
  });

  it("returns an empty string when there is no extractable text", () => {
    expect(reconstructPageText([null, { str: "" }])).toBe("");
  });
});
