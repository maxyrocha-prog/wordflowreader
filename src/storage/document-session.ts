const DB_NAME = "word-flow-reader";
const DB_VERSION = 1;
const STORE_NAME = "documents";
const LAST_DOCUMENT_ID = "last-opened";

interface StoredDocument {
  id: string;
  name: string;
  blob: Blob;
  lastIndex: number;
  updatedAt: number;
}

export interface RestoredSession {
  file: File;
  index: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Este ambiente não oferece armazenamento local IndexedDB."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir o armazenamento local."));
  });
}

export async function saveDocument(file: File): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        id: LAST_DOCUMENT_ID,
        name: file.name,
        blob: file,
        lastIndex: 0,
        updatedAt: Date.now()
      } satisfies StoredDocument);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao salvar o PDF."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Salvamento do PDF cancelado."));
    });
  } finally {
    database.close();
  }
}

export async function saveLastPosition(index: number): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(LAST_DOCUMENT_ID);
      request.onsuccess = () => {
        const record = request.result as StoredDocument | undefined;
        if (record) {
          record.lastIndex = Math.max(0, Math.floor(index));
          record.updatedAt = Date.now();
          store.put(record);
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao salvar a posição."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Salvamento da posição cancelado."));
    });
  } finally {
    database.close();
  }
}

export async function loadLastSession(): Promise<RestoredSession | null> {
  const database = await openDatabase();
  try {
    const record = await new Promise<StoredDocument | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(LAST_DOCUMENT_ID);
      request.onsuccess = () => resolve(request.result as StoredDocument | undefined);
      request.onerror = () => reject(request.error ?? new Error("Falha ao recuperar a sessão."));
    });

    if (!record?.blob) return null;
    const file = new File([record.blob], record.name, {
      type: "application/pdf",
      lastModified: record.updatedAt
    });
    return { file, index: record.lastIndex };
  } finally {
    database.close();
  }
}
