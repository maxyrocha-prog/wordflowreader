import type { ImportedDocument } from "./pdf";

export interface ReaderSection {
  title: string;
  wordIndex: number;
  paragraphIndex: number;
}

export interface ReaderParagraph {
  text: string;
  startWord: number;
  endWord: number;
}

export interface ReaderNavigation {
  sections: ReaderSection[];
  paragraphs: ReaderParagraph[];
}

function isLikelyHeading(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 100) return false;
  const words = value.split(/\s+/u);
  if (words.length > 14) return false;
  if (/^(cap[ií]tulo|chapter|parte|se[cç][aã]o|section)\s+([\divxlcdm]+|[\w-]+)/iu.test(value)) return true;
  if (/^\d+(?:\.\d+){0,3}[.)]?\s+\p{Lu}/u.test(value)) return true;
  const letters = value.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 4 && letters === letters.toLocaleUpperCase("pt-BR")) return true;
  return words.length <= 8 && !/[.!?;:]$/u.test(value) && value === value.replace(/^./u, c => c.toLocaleUpperCase("pt-BR"));
}

export function buildReaderNavigation(document: ImportedDocument): ReaderNavigation {
  const paragraphs: ReaderParagraph[] = [];
  let cursor = 0;

  for (const text of document.paragraphs) {
    const count = (text.match(/\S+/gu) ?? []).length;
    if (!count) continue;
    paragraphs.push({ text, startWord: cursor, endWord: cursor + count - 1 });
    cursor += count;
  }

  const sections: ReaderSection[] = [{ title: "Início do documento", wordIndex: 0, paragraphIndex: 0 }];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraphIndex === 0 || !isLikelyHeading(paragraph.text)) return;
    const title = paragraph.text.length > 64
      ? paragraph.text.slice(0, 61).trimEnd() + "…"
      : paragraph.text;
    sections.push({ title, wordIndex: paragraph.startWord, paragraphIndex });
  });

  return { sections, paragraphs };
}

export function findParagraphIndex(paragraphs: ReaderParagraph[], wordIndex: number): number {
  let low = 0;
  let high = paragraphs.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const paragraph = paragraphs[middle];
    if (wordIndex < paragraph.startWord) high = middle - 1;
    else if (wordIndex > paragraph.endWord) low = middle + 1;
    else return middle;
  }
  return Math.max(0, Math.min(paragraphs.length - 1, low));
}
