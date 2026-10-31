import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ImportedDocument {
  name: string;
  words: string[];
  pages: number[];
}

export async function readPdf(file: File): Promise<ImportedDocument> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const words: string[] = [];
  const pages: number[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item): item is typeof item & { str: string } => "str" in item)
      .map(item => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const pageWords = pageText.match(/\S+/g) ?? [];
    for (const word of pageWords) {
      words.push(word);
      pages.push(pageNumber);
    }
  }

  if (!words.length) {
    throw new Error("Não foi possível extrair texto deste PDF. O documento pode ser digitalizado como imagem.");
  }

  return { name: file.name, words, pages };
}