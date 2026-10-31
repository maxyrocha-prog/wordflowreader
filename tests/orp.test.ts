import { describe, expect, it } from "vitest";
import { getOrpIndex, splitAtOrp } from "../src/core/orp";

describe("ORP word positioning", () => {
  it.each([
    ["a", 0], ["casa", 1], ["palavra", 2], ["extraordinário", 4]
  ])("selects a stable pivot for %s", (word, expected) => {
    expect(getOrpIndex(word)).toBe(expected);
  });

  it("does not split accented Unicode characters", () => {
    expect(splitAtOrp("ação")).toEqual({ before: "a", pivot: "ç", after: "ão" });
  });

  it("handles empty input", () => {
    expect(splitAtOrp("")).toEqual({ before: "", pivot: "", after: "" });
  });

  it("keeps the pivot inside short words", () => {
    expect(splitAtOrp("oi").pivot).toBe("i");
  });
});
