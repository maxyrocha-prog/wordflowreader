import { readPdf, type ImportedDocument } from "../core/pdf";
import { splitAtOrp } from "../core/orp";
import { buildReaderNavigation, findParagraphIndex, type ReaderNavigation } from "../core/navigation";
import { preferences, type ReaderTheme } from "../storage/preferences";
import { loadLastSession, saveDocument, saveLastPosition, listLibraryDocuments, loadLibraryDocument, removeLibraryDocument, setLastOpenedDocument } from "../storage/document-session";

export function mountApp(root: HTMLElement): void {
  let documentData: ImportedDocument | null = null;
  let navigation: ReaderNavigation | null = null;
  let activeDocumentId: string | null = null;
  let index = 0;
  let timer: number | undefined;
  let playing = false;
  let lastPersistAt = 0;
  let speed = clamp(preferences.speed, 50, 800);
  let wordSize = clamp(preferences.wordSize, 65, 120);
  let theme = preferences.theme;

  root.innerHTML = `
    <main class="shell" data-theme="${theme}">
      <header class="topbar">
        <div><div class="eyebrow">LEITURA DINÂMICA</div><h1>Word Flow <span>Reader</span></h1></div>
        <select id="theme" aria-label="Tema">
          <option value="dark">Escuro</option><option value="light">Claro</option>
          <option value="sepia">Sépia</option><option value="papyrus">Papiro</option>
        </select>
      </header>
      <section class="reader-card">
        <div class="reader-label">PALAVRA ATUAL</div>
        <div class="word-stage"><span id="word" class="word-token"><span id="wordBefore"></span><span id="wordPivot" class="orp-pivot">Abra um PDF para começar</span><span id="wordAfter"></span></span></div>
        <div class="reader-footer"><span id="counter">0 / 0 palavras</span><span id="page">Página —</span></div>
      </section>
      <section class="navigation-card"><label for="chapterSelect">Ir para capítulo ou seção</label><select id="chapterSelect" disabled><option value="0">Carregue um PDF</option></select><div class="context-label">CONTEXTO DO PARÁGRAFO</div><p id="paragraphContext" class="paragraph-context">O parágrafo atual aparecerá aqui.</p></section>
      <section class="controls">
        <label class="file-button">＋ Abrir PDF<input id="pdf" type="file" accept="application/pdf,.pdf" hidden></label>
        <button id="play" class="primary" disabled>▶ Iniciar</button>
        <button id="prev" disabled aria-label="Palavra anterior">←</button>
        <button id="next" disabled aria-label="Próxima palavra">→</button>
      </section>
      <section class="library-card"><div class="library-heading"><div><div class="context-label">BIBLIOTECA LOCAL</div><h2>Meus documentos</h2></div><span id="libraryCount" class="muted small">0 PDFs</span></div><div id="libraryList" class="library-list"><p class="muted small">Seus PDFs salvos aparecerão aqui.</p></div></section>
      <section class="settings-card">
        <div class="setting-row"><label for="speed">Velocidade</label><strong><span id="speedValue">${speed}</span> ppm</strong></div>
        <input id="speed" type="range" min="50" max="800" step="10" value="${speed}">
        <div class="setting-row"><label for="size">Tamanho da palavra</label><strong id="sizeValue">${wordSize}%</strong></div>
        <input id="size" type="range" min="65" max="120" step="5" value="${wordSize}">
        <div class="progress"><div id="progress"></div></div>
        <p id="filename" class="muted">Nenhum documento carregado</p>
        <p class="muted small">Sua última leitura é salva neste dispositivo para permitir a retomada posterior.</p>
      </section>
      <div id="message" role="status" aria-live="polite"></div>
    </main>`;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const word = $("word");
  const wordBefore = $("wordBefore");
  const wordPivot = $("wordPivot");
  const wordAfter = $("wordAfter");
  const counter = $("counter");
  const page = $("page");
  const play = $("play") as HTMLButtonElement;
  const prev = $("prev") as HTMLButtonElement;
  const next = $("next") as HTMLButtonElement;
  const progress = $("progress");
  const message = $("message");
  const chapterSelect = $("chapterSelect") as HTMLSelectElement;
  const paragraphContext = $("paragraphContext");
  const libraryList = $("libraryList");
  const libraryCount = $("libraryCount");

  function prepareNavigation(): void {
    if (!documentData) return;
    navigation = buildReaderNavigation(documentData);
    chapterSelect.replaceChildren();
    navigation.sections.forEach((section, sectionIndex) => {
      const option = document.createElement("option");
      option.value = String(sectionIndex);
      option.textContent = section.title;
      chapterSelect.append(option);
    });
    chapterSelect.disabled = navigation.sections.length === 0;
  }

  function persistPosition(force = false): void {
    if (!documentData || !activeDocumentId) return;
    const now = Date.now();
    if (!force && now - lastPersistAt < 1000) return;
    lastPersistAt = now;
    void saveLastPosition(index, activeDocumentId ?? undefined).catch(() => {
      message.textContent = "Não foi possível salvar a posição de leitura neste dispositivo.";
    });
  }

  async function refreshLibrary(): Promise<void> {
    try {
      const documents = await listLibraryDocuments();
      libraryCount.textContent = `${documents.length} PDF${documents.length === 1 ? "" : "s"}`;
      libraryList.replaceChildren();
      if (!documents.length) {
        const empty = document.createElement("p");
        empty.className = "muted small";
        empty.textContent = "Nenhum PDF salvo. Use “Abrir PDF” para adicionar o primeiro.";
        libraryList.append(empty);
        return;
      }
      documents.forEach(item => {
        const card = document.createElement("article");
        card.className = "library-item";
        const info = document.createElement("div");
        info.className = "library-info";
        const title = document.createElement("strong");
        title.textContent = item.name;
        title.title = item.name;
        const detail = document.createElement("span");
        detail.className = "muted small";
        const percent = item.wordCount > 0 ? Math.min(100, Math.round(item.lastIndex / item.wordCount * 100)) : 0;
        detail.textContent = item.wordCount > 0
          ? `${percent}% lido · palavra ${Math.min(item.lastIndex + 1, item.wordCount).toLocaleString("pt-BR")} de ${item.wordCount.toLocaleString("pt-BR")}`
          : "Ainda sem progresso registrado";
        const bar = document.createElement("div");
        bar.className = "library-progress";
        const fill = document.createElement("span");
        fill.style.width = `${percent}%`;
        bar.append(fill);
        info.append(title, detail, bar);
        const actions = document.createElement("div");
        actions.className = "library-actions";
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.textContent = "Abrir";
        openButton.dataset.openDocument = item.id;
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Excluir";
        deleteButton.className = "quiet-button";
        deleteButton.dataset.deleteDocument = item.id;
        actions.append(openButton, deleteButton);
        card.append(info, actions);
        libraryList.append(card);
      });
    } catch {
      libraryList.textContent = "Não foi possível carregar a biblioteca neste dispositivo.";
    }
  }

  async function openSavedDocument(id: string): Promise<void> {
    stop();
    message.textContent = "Abrindo documento salvo…";
    try {
      const session = await loadLibraryDocument(id);
      if (!session) throw new Error("Este PDF não está mais disponível na biblioteca.");
      documentData = await readPdf(session.file);
      activeDocumentId = session.id;
      await setLastOpenedDocument(session.id);
      prepareNavigation();
      index = clamp(session.index, 0, Math.max(0, documentData.words.length - 1));
      $("filename").textContent = documentData.name;
      play.disabled = prev.disabled = next.disabled = false;
      render();
      message.textContent = `Leitura retomada na palavra ${index + 1} de ${documentData.words.length.toLocaleString("pt-BR")}.`;
    await refreshLibrary();
      await refreshLibrary();
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : "Não foi possível abrir o PDF salvo.";
    }
  }

  function render() {
    if (!documentData) return;
    const currentWord = documentData.words[index] ?? "";
    const parts = splitAtOrp(currentWord);
    wordBefore.textContent = parts.before;
    wordPivot.textContent = parts.pivot;
    wordAfter.textContent = parts.after;
    word.style.fontSize = `clamp(2rem, ${wordSize * 0.62}px, 8rem)`;
    counter.textContent = `${index + 1} / ${documentData.words.length} palavras`;
    page.textContent = `Página ${documentData.pages[index] ?? "—"}`;
    progress.style.width = `${((index + 1) / documentData.words.length) * 100}%`;
    if (navigation) {
      const sectionIndex = navigation.sections.reduce((found, section, i) => section.wordIndex <= index ? i : found, 0);
      chapterSelect.value = String(sectionIndex);
      const paragraphIndex = findParagraphIndex(navigation.paragraphs, index);
      paragraphContext.textContent = navigation.paragraphs[paragraphIndex]?.text ?? "Contexto indisponível.";
    }
    prev.disabled = index <= 0;
    next.disabled = index >= documentData.words.length - 1;
  }

  function stop() {
    playing = false;
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    play.textContent = "▶ Iniciar";
    persistPosition(true);
  }

  function start() {
    if (!documentData || playing) return;
    if (index >= documentData.words.length - 1) index = 0;
    playing = true;
    play.textContent = "Ⅱ Pausar";
    timer = window.setInterval(() => {
      if (!documentData || index >= documentData.words.length - 1) {
        stop();
        return;
      }
      index++;
      render();
      persistPosition();
    }, 60000 / speed);
  }

  $("pdf").addEventListener("change", async event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    stop();
    message.textContent = "Importando e extraindo texto do PDF…";
    try {
      documentData = await readPdf(file);
      prepareNavigation();
      index = 0;
      try { activeDocumentId = await saveDocument(file, documentData.words.length); } catch { activeDocumentId = null; /* Reading remains available if local storage is unavailable. */ }
      $("filename").textContent = documentData.name;
      play.disabled = prev.disabled = next.disabled = false;
      render();
      message.textContent = `${documentData.words.length.toLocaleString("pt-BR")} palavras extraídas.`;
      await refreshLibrary();
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : "Falha ao abrir o PDF.";
    }
  });

  libraryList.addEventListener("click", event => {
    const target = event.target as HTMLElement;
    const openButton = target.closest<HTMLButtonElement>("[data-open-document]");
    const deleteButton = target.closest<HTMLButtonElement>("[data-delete-document]");
    if (openButton?.dataset.openDocument) {
      void openSavedDocument(openButton.dataset.openDocument);
    } else if (deleteButton?.dataset.deleteDocument) {
      const id = deleteButton.dataset.deleteDocument;
      if (!window.confirm("Excluir este PDF da biblioteca deste dispositivo?")) return;
      void removeLibraryDocument(id).then(async () => {
        if (activeDocumentId === id) {
          stop();
          activeDocumentId = null;
          documentData = null;
          navigation = null;
          $("filename").textContent = "Nenhum documento carregado";
          wordBefore.textContent = "";
          wordPivot.textContent = "Abra um PDF para começar";
          wordAfter.textContent = "";
          counter.textContent = "0 / 0 palavras";
          page.textContent = "Página —";
          progress.style.width = "0%";
          play.disabled = prev.disabled = next.disabled = true;
          chapterSelect.replaceChildren(new Option("Carregue um PDF", "0"));
          chapterSelect.disabled = true;
          paragraphContext.textContent = "O parágrafo atual aparecerá aqui.";
        }
        await refreshLibrary();
        message.textContent = "PDF excluído da biblioteca local.";
      }).catch(() => { message.textContent = "Não foi possível excluir este PDF."; });
    }
  });

  chapterSelect.addEventListener("change", () => {
    const section = navigation?.sections[Number(chapterSelect.value)];
    if (!section || !documentData) return;
    stop();
    index = clamp(section.wordIndex, 0, Math.max(0, documentData.words.length - 1));
    render();
    persistPosition(true);
  });

  play.addEventListener("click", () => playing ? stop() : start());
  prev.addEventListener("click", () => { stop(); index = Math.max(0, index - 1); render(); persistPosition(true); });
  next.addEventListener("click", () => { stop(); index = Math.min((documentData?.words.length ?? 1) - 1, index + 1); render(); persistPosition(true); });

  $("speed").addEventListener("input", event => {
    speed = Number((event.target as HTMLInputElement).value);
    preferences.speed = speed;
    $("speedValue").textContent = String(speed);
    if (playing) { stop(); start(); }
  });

  $("size").addEventListener("input", event => {
    wordSize = Number((event.target as HTMLInputElement).value);
    preferences.wordSize = wordSize;
    $("sizeValue").textContent = `${wordSize}%`;
    if (documentData) render();
  });

  window.addEventListener("pagehide", () => stop());

  void loadLastSession().then(async session => {
    if (!session || documentData) return;
    documentData = await readPdf(session.file);
    activeDocumentId = session.id;
    prepareNavigation();
    index = clamp(session.index, 0, Math.max(0, documentData.words.length - 1));
    $("filename").textContent = documentData.name;
    play.disabled = prev.disabled = next.disabled = false;
    render();
    message.textContent = `Leitura retomada na palavra ${index + 1} de ${documentData.words.length.toLocaleString("pt-BR")}.`;
    await refreshLibrary();
  }).catch(() => {
    // A fresh session can still be used when IndexedDB is unavailable or empty.
  });

  void refreshLibrary();

  const themeSelect = $("theme") as HTMLSelectElement;
  themeSelect.value = theme;
  themeSelect.addEventListener("change", () => {
    theme = themeSelect.value as ReaderTheme;
    preferences.theme = theme;
    root.querySelector<HTMLElement>(".shell")!.dataset.theme = theme;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}