export interface IndexedPdfText {
  words: string[];
  pages: number[];
  pageStarts: number[];
  paragraphs: string[];
}

/** Builds word/page indexes and paragraph navigation data from reconstructed pages. */
export function indexPdfPages(pageTexts: string[]): IndexedPdfText {
  const words: string[] = [];
  const pages: number[] = [];
  const pageStarts: number[] = [];
  const paragraphs: string[] = [];

  pageTexts.forEach((pageText, pageIndex) => {
    pageStarts.push(words.length);

    for (const paragraph of pageText.split(/\n{2,}/u)) {
      const normalized = paragraph
        .replace(/\s*\n\s*/gu, " ")
        .replace(/\s+/gu, " ")
        .trim();
      if (normalized) paragraphs.push(normalized);
    }

    for (const word of pageText.match(/\S+/gu) ?? []) {
      words.push(word);
      pages.push(pageIndex + 1);
    }
  });

  return { words, pages, pageStarts, paragraphs };
}
