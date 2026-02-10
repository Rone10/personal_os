import { describe, it, expect } from "vitest";
import {
  normalizeArabic,
  stripDiacritics,
  tokenizeArabic,
  containsArabic,
  extractSnippet,
} from "./arabic";

describe("normalizeArabic", () => {
  it("removes tatweel characters", () => {
    expect(normalizeArabic("كـتـاب")).toBe("كتاب");
  });

  it("preserves alef/hamza variants", () => {
    expect(normalizeArabic("أحمد")).toBe("أحمد");
    expect(normalizeArabic("إبراهيم")).toBe("إبراهيم");
    expect(normalizeArabic("آمين")).toBe("آمين");
  });

  it("collapses whitespace", () => {
    expect(normalizeArabic("كتاب   جميل")).toBe("كتاب جميل");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeArabic("  كتاب  ")).toBe("كتاب");
  });

  it("handles empty string", () => {
    expect(normalizeArabic("")).toBe("");
  });

  it("handles string with only tatweel", () => {
    expect(normalizeArabic("ـــ")).toBe("");
  });
});

describe("stripDiacritics", () => {
  it("removes harakat (vowel marks)", () => {
    expect(stripDiacritics("كِتَابٌ")).toBe("كتاب");
  });

  it("removes shadda", () => {
    expect(stripDiacritics("مُحَمَّد")).toBe("محمد");
  });

  it("removes sukun", () => {
    expect(stripDiacritics("مَسْجِد")).toBe("مسجد");
  });

  it("preserves alef/hamza variants", () => {
    expect(stripDiacritics("أَحْمَد")).toBe("أحمد");
    expect(stripDiacritics("إِبْرَاهِيم")).toBe("إبراهيم");
  });

  it("removes tatweel", () => {
    expect(stripDiacritics("كـتـاب")).toBe("كتاب");
  });

  it("collapses whitespace", () => {
    expect(stripDiacritics("كِتَاب   جَمِيل")).toBe("كتاب جميل");
  });

  it("handles text with Quranic annotation marks", () => {
    // Quranic stop marks and annotations are in range U+06D6-U+06ED
    const withAnnotations = "وَقَفَ\u06D6";
    expect(stripDiacritics(withAnnotations)).toBe("وقف");
  });
});

describe("tokenizeArabic", () => {
  it("splits on whitespace", () => {
    expect(tokenizeArabic("كتاب جميل")).toEqual(["كتاب", "جميل"]);
  });

  it("splits on punctuation", () => {
    expect(tokenizeArabic("كتاب، جميل")).toEqual(["كتاب", "جميل"]);
  });

  it("handles Arabic comma and semicolon", () => {
    expect(tokenizeArabic("أحمد؛ محمد")).toEqual(["أحمد", "محمد"]);
  });

  it("handles Arabic question mark", () => {
    expect(tokenizeArabic("كيف؟")).toEqual(["كيف"]);
  });

  it("returns unique tokens", () => {
    expect(tokenizeArabic("كتاب كتاب كتاب")).toEqual(["كتاب"]);
  });

  it("strips diacritics from tokens", () => {
    expect(tokenizeArabic("كِتَابٌ")).toEqual(["كتاب"]);
  });

  it("filters empty strings", () => {
    expect(tokenizeArabic("  ")).toEqual([]);
  });

  it("handles mixed punctuation", () => {
    expect(tokenizeArabic("(كتاب)")).toEqual(["كتاب"]);
  });
});

describe("containsArabic", () => {
  it("returns true for Arabic text", () => {
    expect(containsArabic("كتاب")).toBe(true);
  });

  it("returns true for mixed Arabic and English", () => {
    expect(containsArabic("Hello كتاب World")).toBe(true);
  });

  it("returns false for English only", () => {
    expect(containsArabic("Hello World")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsArabic("")).toBe(false);
  });

  it("returns true for Arabic numbers", () => {
    // Arabic-Indic digits are in the Arabic Unicode block
    expect(containsArabic("١٢٣")).toBe(true);
  });
});

describe("extractSnippet", () => {
  const text = "هذا نص طويل للاختبار يحتوي على كلمات كثيرة";

  it("extracts snippet around position", () => {
    const snippet = extractSnippet(text, 10, 15, 5);
    expect(snippet).toContain("...");
  });

  it("adds ellipsis at start when truncated", () => {
    const snippet = extractSnippet(text, 10, 15, 5);
    expect(snippet.startsWith("...")).toBe(true);
  });

  it("adds ellipsis at end when truncated", () => {
    const snippet = extractSnippet(text, 10, 15, 5);
    expect(snippet.endsWith("...")).toBe(true);
  });

  it("no ellipsis at start when at beginning", () => {
    const snippet = extractSnippet(text, 0, 5, 10);
    expect(snippet.startsWith("...")).toBe(false);
  });

  it("no ellipsis at end when at end of text", () => {
    const snippet = extractSnippet(text, text.length - 5, text.length, 10);
    expect(snippet.endsWith("...")).toBe(false);
  });

  it("returns full text when context covers everything", () => {
    const shortText = "قصير";
    const snippet = extractSnippet(shortText, 0, shortText.length, 100);
    expect(snippet).toBe(shortText);
  });
});
