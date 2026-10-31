import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { reconstructPageText } from "./pdf-text";
import { indexPdfPages } from "./pdf-index";

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

export { reconstructPageText } from "./pdf-text";
export { indexPdfPages } from "./pdf-index";

export async function readPdf(file: File): Promise<ImportedDocument> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(reconstructPageText(content.items));
  }

  const { words, pages, pageStarts, paragraphs } = indexPdfPages(pageTexts);

  if (!words.length) {
    throw new Error(
      "Não foi possível extrair texto deste PDF. O documento pode estar digitalizado como imagem e precisar de OCR."
    );
  }

  return { name: file.name, words, pages, pageStarts, pageTexts, paragraphs };
}
