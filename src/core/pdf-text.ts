type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
};

function isTextItem(item: unknown): item is PdfTextItem {
  return typeof item === "object" && item !== null &&
    "str" in item && typeof item.str === "string" &&
    "transform" in item && Array.isArray(item.transform) &&
    "width" in item && typeof item.width === "number" &&
    "height" in item && typeof item.height === "number" &&
    "hasEOL" in item && typeof item.hasEOL === "boolean";
}

/**
 * Reconstructs a page from PDF.js text items. Geometric positions help retain
 * line boundaries; hasEOL is used as an additional explicit line-break signal.
 */
export function reconstructPageText(items: unknown[]): string {
  const textItems = items.filter(isTextItem);
  let output = "";
  let previous: PdfTextItem | undefined;

  for (const item of textItems) {
    const value = item.str;
    if (!value) {
      if (item.hasEOL) output = output.trimEnd() + "\n";
      previous = item;
      continue;
    }

    if (previous) {
      const currentY = item.transform[5] ?? 0;
      const previousY = previous.transform[5] ?? currentY;
      const currentFontSize = Math.max(
        1,
        Math.hypot(item.transform[0] ?? 0, item.transform[1] ?? 0),
        item.height
      );
      const previousFontSize = Math.max(
        1,
        Math.hypot(previous.transform[0] ?? 0, previous.transform[1] ?? 0),
        previous.height
      );
      const fontSize = Math.max(currentFontSize, previousFontSize);
      const verticalGap = Math.abs(currentY - previousY);

      if (verticalGap > fontSize * 0.55) {
        output = output.trimEnd() + (verticalGap > fontSize * 1.45 ? "\n\n" : "\n");
      } else {
        const previousRight = (previous.transform[4] ?? 0) + previous.width;
        const currentLeft = item.transform[4] ?? previousRight;
        const horizontalGap = currentLeft - previousRight;
        const needsSpace = horizontalGap > Math.max(1, fontSize * 0.18);
        if (needsSpace && !/\s$/u.test(output) && !/^\s/u.test(value)) output += " ";
      }
    }

    output += value;
    if (item.hasEOL) output = output.trimEnd() + "\n";
    previous = item;
  }

  return output
    .split("\n")
    .map(line => line.replace(/[\t ]+/gu, " ").trim())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

