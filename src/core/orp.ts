/**
 * Returns the character index used as the visual recognition pivot (ORP).
 * The thresholds follow a readable, deterministic approximation for RSVP.
 * Array.from is used so accented letters and other Unicode code points are
 * not split into UTF-16 surrogate halves.
 */
export function getOrpIndex(word: string): number {
  const length = Array.from(word).length;
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  if (length <= 17) return 4;
  return 5;
}

/** Split a word into the text before, at, and after its ORP character. */
export function splitAtOrp(word: string): {
  before: string;
  pivot: string;
  after: string;
} {
  const characters = Array.from(word);
  if (!characters.length) return { before: "", pivot: "", after: "" };
  const index = Math.min(getOrpIndex(word), characters.length - 1);
  return {
    before: characters.slice(0, index).join(""),
    pivot: characters[index],
    after: characters.slice(index + 1).join("")
  };
}
