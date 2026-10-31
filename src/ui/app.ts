import { readPdf, type ImportedDocument } from "../core/pdf";
import { preferences, type ReaderTheme } from "../storage/preferences";

export function mountApp(root: HTMLElement): void {
  let documentData: ImportedDocument | null = null;
  let index = 0;
  let timer: number | undefined;
  let playing = false;
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
        <div class="word-stage"><span id="word">Abra um PDF para começar</span></div>
        <div class="reader-footer"><span id="counter">0 / 0 palavras</span><span id="page">Página —</span></div>
      </section>
      <section class="controls">
        <label class="file-button">＋ Abrir PDF<input id="pdf" type="file" accept="application/pdf,.pdf" hidden></label>
        <button id="play" class="primary" disabled>▶ Iniciar</button>
        <button id="prev" disabled aria-label="Palavra anterior">←</button>
        <button id="next" disabled aria-label="Próxima palavra">→</button>
      </section>
      <section class="settings-card">
        <div class="setting-row"><label for="speed">Velocidade</label><strong><span id="speedValue">${speed}</span> ppm</strong></div>
        <input id="speed" type="range" min="50" max="800" step="10" value="${speed}">
        <div class="setting-row"><label for="size">Tamanho da palavra</label><strong id="sizeValue">${wordSize}%</strong></div>
        <input id="size" type="range" min="65" max="120" step="5" value="${wordSize}">
        <div class="progress"><div id="progress"></div></div>
        <p id="filename" class="muted">Nenhum documento carregado</p>
        <p class="muted small">A versão inicial preserva o fluxo básico de leitura. Marcadores, capítulos e biblioteca serão incorporados nas próximas etapas.</p>
      </section>
      <div id="message" role="status" aria-live="polite"></div>
    </main>`;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const word = $("word");
  const counter = $("counter");
  const page = $("page");
  const play = $("play") as HTMLButtonElement;
  const prev = $("prev") as HTMLButtonElement;
  const next = $("next") as HTMLButtonElement;
  const progress = $("progress");
  const message = $("message");

  function render() {
    if (!documentData) return;
    word.textContent = documentData.words[index] ?? "";
    word.style.fontSize = `clamp(2rem, ${wordSize * 0.62}px, 8rem)`;
    counter.textContent = `${index + 1} / ${documentData.words.length} palavras`;
    page.textContent = `Página ${documentData.pages[index] ?? "—"}`;
    progress.style.width = `${((index + 1) / documentData.words.length) * 100}%`;
    prev.disabled = index <= 0;
    next.disabled = index >= documentData.words.length - 1;
  }

  function stop() {
    playing = false;
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    play.textContent = "▶ Iniciar";
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
    }, 60000 / speed);
  }

  $("pdf").addEventListener("change", async event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    stop();
    message.textContent = "Importando e extraindo texto do PDF…";
    try {
      documentData = await readPdf(file);
      index = 0;
      $("filename").textContent = documentData.name;
      play.disabled = prev.disabled = next.disabled = false;
      render();
      message.textContent = `${documentData.words.length.toLocaleString("pt-BR")} palavras extraídas.`;
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : "Falha ao abrir o PDF.";
    }
  });

  play.addEventListener("click", () => playing ? stop() : start());
  prev.addEventListener("click", () => { stop(); index = Math.max(0, index - 1); render(); });
  next.addEventListener("click", () => { stop(); index = Math.min((documentData?.words.length ?? 1) - 1, index + 1); render(); });

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