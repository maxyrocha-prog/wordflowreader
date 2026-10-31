const DB_NAME = "word-flow-reader";
const DB_VERSION = 2;
const STORE_NAME = "documents";
const META_STORE = "metadata";
const LAST_DOCUMENT_ID = "last-opened";
const LAST_OPENED_KEY = "last-opened-id";

interface StoredDocument {
  id: string;
  name: string;
  blob: Blob;
  lastIndex: number;
  updatedAt: number;
  addedAt?: number;
  size?: number;
  wordCount?: number;
}

export interface RestoredSession {
  id: string;
  file: File;
  index: number;
}

export interface LibraryDocument {
  id: string;
  name: string;
  lastIndex: number;
  updatedAt: number;
  addedAt: number;
  size: number;
  wordCount: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Este ambiente não oferece armazenamento local IndexedDB."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
      // A versão anterior guardava um único PDF com o ID "last-opened".
      // Mantemos esse registro e o usamos como primeiro item da biblioteca.
      const transaction = request.transaction;
      if (transaction && (event as IDBVersionChangeEvent).oldVersion < 2) {
        const store = transaction.objectStore(STORE_NAME);
        const legacyRequest = store.get(LAST_DOCUMENT_ID);
        legacyRequest.onsuccess = () => {
          if (legacyRequest.result) {
            transaction.objectStore(META_STORE).put({ key: LAST_OPENED_KEY, value: LAST_DOCUMENT_ID });
          }
        };
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir o armazenamento local."));
  });
}

function createId(): string {
  const cryptoApi = globalThis.crypto;
  const uuid = (cryptoApi as Crypto & { randomUUID?: () => string }).randomUUID;
  if (typeof uuid === "function") return uuid.call(cryptoApi);
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}

export async function saveDocument(file: File, wordCount = 0): Promise<string> {
  const database = await openDatabase();
  const id = createId();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME, META_STORE], "readwrite");
      transaction.objectStore(STORE_NAME).put({
        id, name: file.name, blob: file, lastIndex: 0,
        addedAt: Date.now(), updatedAt: Date.now(), size: file.size, wordCount
      } satisfies StoredDocument);
      transaction.objectStore(META_STORE).put({ key: LAST_OPENED_KEY, value: id });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao salvar o PDF."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Salvamento do PDF cancelado."));
    });
    return id;
  } finally {
    database.close();
  }
}

export async function saveLastPosition(index: number, documentId?: string, wordCount?: number): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME, META_STORE], "readwrite");
      const metaRequest = transaction.objectStore(META_STORE).get(LAST_OPENED_KEY);
      metaRequest.onsuccess = () => {
        const id = documentId ?? metaRequest.result?.value ?? LAST_DOCUMENT_ID;
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => {
          const record = request.result as StoredDocument | undefined;
          if (record) {
            record.lastIndex = Math.max(0, Math.floor(index));
            record.updatedAt = Date.now();
            if (wordCount !== undefined) record.wordCount = wordCount;
            store.put(record);
          }
        };
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao salvar a posição."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Salvamento da posição cancelado."));
    });
  } finally {
    database.close();
  }
}

export async function listLibraryDocuments(): Promise<LibraryDocument[]> {
  const database = await openDatabase();
  try {
    const records = await new Promise<StoredDocument[]>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as StoredDocument[]);
      request.onerror = () => reject(request.error ?? new Error("Falha ao listar a biblioteca."));
    });
    return records.filter(record => record.blob).map(record => ({
      id: record.id, name: record.name, lastIndex: record.lastIndex ?? 0,
      updatedAt: record.updatedAt ?? Date.now(), addedAt: record.addedAt ?? record.updatedAt ?? Date.now(),
      size: record.size ?? record.blob.size, wordCount: record.wordCount ?? 0
    })).sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    database.close();
  }
}

export async function loadLibraryDocument(id: string): Promise<RestoredSession | null> {
  const database = await openDatabase();
  try {
    const record = await new Promise<StoredDocument | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result as StoredDocument | undefined);
      request.onerror = () => reject(request.error ?? new Error("Falha ao abrir o documento salvo."));
    });
    if (!record?.blob) return null;
    const file = new File([record.blob], record.name, { type: "application/pdf", lastModified: record.updatedAt });
    return { id: record.id, file, index: record.lastIndex ?? 0 };
  } finally {
    database.close();
  }
}

export async function setLastOpenedDocument(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(META_STORE, "readwrite");
      transaction.objectStore(META_STORE).put({ key: LAST_OPENED_KEY, value: id });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao atualizar o documento atual."));
    });
  } finally {
    database.close();
  }
}

export async function removeLibraryDocument(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME, META_STORE], "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      const meta = transaction.objectStore(META_STORE);
      const request = meta.get(LAST_OPENED_KEY);
      request.onsuccess = () => {
        if (request.result?.value === id) meta.delete(LAST_OPENED_KEY);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao remover o documento."));
    });
  } finally {
    database.close();
  }
}

export async function loadLastSession(): Promise<RestoredSession | null> {
  const database = await openDatabase();
  try {
    const id = await new Promise<string>((resolve, reject) => {
      const transaction = database.transaction(META_STORE, "readonly");
      const request = transaction.objectStore(META_STORE).get(LAST_OPENED_KEY);
      request.onsuccess = () => resolve(request.result?.value ?? LAST_DOCUMENT_ID);
      request.onerror = () => reject(request.error ?? new Error("Falha ao recuperar a sessão."));
    });
    database.close();
    return loadLibraryDocument(id);
  } catch (error) {
    database.close();
    throw error;
  }
}
