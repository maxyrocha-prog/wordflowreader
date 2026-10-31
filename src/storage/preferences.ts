export type ReaderTheme = "dark" | "light" | "sepia" | "papyrus";

const THEME_KEY = "wfr.theme";
const SIZE_KEY = "wfr.wordSize";
const SPEED_KEY = "wfr.speed";

export const preferences = {
  get theme(): ReaderTheme {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "sepia" || value === "papyrus" ? value : "dark";
  },
  set theme(value: ReaderTheme) { localStorage.setItem(THEME_KEY, value); },
  get wordSize(): number { return Number(localStorage.getItem(SIZE_KEY) ?? 100); },
  set wordSize(value: number) { localStorage.setItem(SIZE_KEY, String(value)); },
  get speed(): number { return Number(localStorage.getItem(SPEED_KEY) ?? 250); },
  set speed(value: number) { localStorage.setItem(SPEED_KEY, String(value)); }
};