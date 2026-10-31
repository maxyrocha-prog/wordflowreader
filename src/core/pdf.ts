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

/**
 * Extracts a PDF and always releases the PDF.js worker/document resources.
 * This matters especially for large PDFs and repeated imports in a mobile WebView.
 */
export async function readPdf(file: File): Promise<ImportedDocument> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });

  try {
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        pageTexts.push(reconstructPageText(content.items));
      } finally {
        // Release page-level resources even if text extraction fails.
        page.cleanup();
      }
    }

    const { words, pages, pageStarts, paragraphs } = indexPdfPages(pageTexts);

    if (!words.length) {
      throw new Error(
        "Não foi possível extrair texto deste PDF. O documento pode estar digitalizado como imagem e precisar de OCR."
      );
    }

    return { name: file.name, words, pages, pageStarts, pageTexts, paragraphs };
  } finally {
    await loadingTask.destroy();
  }
}
