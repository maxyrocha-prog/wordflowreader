import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  listLibraryDocuments,
  loadLastSession,
  loadLibraryDocument,
  removeLibraryDocument,
  saveDocument,
  saveLastPosition,
  setLastOpenedDocument
} from "../src/storage/document-session";

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: globalThis
});

async function clearDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("word-flow-reader");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion was blocked."));
  });
}

afterEach(async () => {
  await clearDatabase();
});

describe("local document library", () => {
  it("saves a PDF and lists its metadata", async () => {
    const file = new File(["PDF sample"], "amostra.pdf", { type: "application/pdf" });
    const id = await saveDocument(file, 120);
    const library = await listLibraryDocuments();

    expect(library).toHaveLength(1);
    expect(library[0]).toMatchObject({
      id,
      name: "amostra.pdf",
      wordCount: 120,
      lastIndex: 0,
      size: file.size
    });
  });

  it("restores the file and its saved reading position", async () => {
    const file = new File(["Conteúdo de teste"], "leitura.pdf", { type: "application/pdf" });
    const id = await saveDocument(file, 40);
    await saveLastPosition(17, id, 40);

    const restored = await loadLibraryDocument(id);
    expect(restored?.file.name).toBe("leitura.pdf");
    expect(restored?.index).toBe(17);
    expect(await restored?.file.text()).toBe("Conteúdo de teste");
  });

  it("remembers the last opened document", async () => {
    const first = await saveDocument(new File(["um"], "um.pdf", { type: "application/pdf" }), 1);
    const second = await saveDocument(new File(["dois"], "dois.pdf", { type: "application/pdf" }), 2);
    await setLastOpenedDocument(first);

    const restored = await loadLastSession();
    expect(restored?.id).toBe(first);
    expect(restored?.file.name).toBe("um.pdf");
    expect(second).not.toBe(first);
  });

  it("migrates the previous single-PDF session into the library", async () => {
    const legacyFile = new File(["sessão antiga"], "antigo.pdf", { type: "application/pdf" });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("word-flow-reader", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("documents", { keyPath: "id" });
      };
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("documents", "readwrite");
        transaction.objectStore("documents").put({
          id: "last-opened",
          name: legacyFile.name,
          blob: legacyFile,
          lastIndex: 11,
          updatedAt: Date.now()
        });
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });

    const restored = await loadLastSession();
    expect(restored?.id).toBe("last-opened");
    expect(restored?.file.name).toBe("antigo.pdf");
    expect(restored?.index).toBe(11);
  });

  it("keeps independent reading positions for each PDF", async () => {
    const first = await saveDocument(new File(["primeiro"], "primeiro.pdf", { type: "application/pdf" }), 30);
    const second = await saveDocument(new File(["segundo"], "segundo.pdf", { type: "application/pdf" }), 50);

    await saveLastPosition(7, first, 30);
    await saveLastPosition(23, second, 50);

    expect((await loadLibraryDocument(first))?.index).toBe(7);
    expect((await loadLibraryDocument(second))?.index).toBe(23);
  });

  it("clamps saved positions to the valid word range", async () => {
    const id = await saveDocument(new File(["limites"], "limites.pdf", { type: "application/pdf" }), 10);

    await saveLastPosition(99, id, 10);
    expect((await loadLibraryDocument(id))?.index).toBe(9);

    await saveLastPosition(-5, id, 10);
    expect((await loadLibraryDocument(id))?.index).toBe(0);

    await saveLastPosition(Number.NaN, id, 10);
    expect((await loadLibraryDocument(id))?.index).toBe(0);
  });

  it("normalizes invalid word counts before saving progress", async () => {
    const id = await saveDocument(new File(["vazio"], "vazio.pdf", { type: "application/pdf" }), 5);

    await saveLastPosition(4, id, -10);
    let saved = await listLibraryDocuments();
    expect(saved[0]).toMatchObject({ wordCount: 0, lastIndex: 0 });

    await saveLastPosition(4, id, Number.NaN);
    saved = await listLibraryDocuments();
    expect(saved[0]).toMatchObject({ wordCount: 0, lastIndex: 0 });
  });

  it("removes a document from the library and last-session pointer", async () => {
    const id = await saveDocument(new File(["remover"], "remover.pdf", { type: "application/pdf" }), 1);
    await removeLibraryDocument(id);

    expect(await listLibraryDocuments()).toHaveLength(0);
    expect(await loadLibraryDocument(id)).toBeNull();
    expect(await loadLastSession()).toBeNull();
  });
});
