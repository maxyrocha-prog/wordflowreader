import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ImportedDocument {
  name: string;
  words: string[];
  /** One-based PDF page number for each word. */
  pages: number[];
  /** Word index at which each page begins. */
  pageStarts: number[];
  /** Reconstructed text for each page, retaining line and paragraph breaks. */
  pageTexts: string[];
  /** Paragraphs in reading order, retained for context and navigation features. */
  paragraphs: string[];
}

import { reconstructPageText } from "./pdf-text";
export { reconstructPageText } from "./pdf-text";

export async function readPdf(file: File): Promise<ImportedDocument> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const words: string[] = [];
  const pages: number[] = [];
  const pageStarts: number[] = [];
  const pageTexts: string[] = [];
  const paragraphs: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = reconstructPageText(content.items);
    pageTexts.push(pageText);
    pageStarts.push(words.length);

    for (const paragraph of pageText.split(/\n{2,}/u)) {
      const normalized = paragraph.replace(/\s*\n\s*/gu, " ").replace(/\s+/gu, " ").trim();
      if (normalized) paragraphs.push(normalized);
    }

    const pageWords = pageText.match(/\S+/gu) ?? [];
    for (const word of pageWords) {
      words.push(word);
      pages.push(pageNumber);
    }
  }

  if (!words.length) {
    throw new Error(
      "Não foi possível extrair texto deste PDF. O documento pode estar digitalizado como imagem e precisar de OCR."
    );
  }

  return { name: file.name, words, pages, pageStarts, pageTexts, paragraphs };
}
