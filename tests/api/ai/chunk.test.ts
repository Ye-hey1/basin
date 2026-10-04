import { describe, expect, it } from "vitest";
import { chunkMarkdown, estimateTokens } from "../../../packages/ai/src/chunk";

describe("chunkMarkdown", () => {
  it("returns the whole text as one chunk when short", () => {
    const text = "# Title\n\nA short paragraph.";
    expect(chunkMarkdown(text)).toEqual([text]);
  });

  it("returns no chunks for empty input", () => {
    expect(chunkMarkdown("")).toEqual([]);
    expect(chunkMarkdown("   \n\n  ")).toEqual([]);
  });

  it("keeps a heading with its section", () => {
    const longParagraph = "word ".repeat(500).trim();
    const markdown = `# Intro\n\nshort\n\n## Details\n\n${longParagraph}\n\n## More\n\ntail`;
    const chunks = chunkMarkdown(markdown);

    expect(chunks.length).toBeGreaterThan(1);
    // The oversized Details section becomes its own chunk(s) starting with
    // its heading, and "More" starts a fresh chunk rather than bleeding in.
    const more = chunks.find((chunk) => chunk.startsWith("## More"));
    expect(more).toBeDefined();
    expect(more).toContain("tail");
  });

  it("splits an oversized single paragraph into bounded chunks", () => {
    const sentence =
      "This is a reasonably long sentence with several words in it. ";
    const markdown = sentence.repeat(200);
    const chunks = chunkMarkdown(markdown);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(2600);
    }
  });

  it("never loses content across chunk boundaries", () => {
    const sections = Array.from(
      { length: 8 },
      (_, index) =>
        `## Section ${index}\n\n${`content for section ${index}. `.repeat(120)}`,
    ).join("\n\n");
    const chunks = chunkMarkdown(sections);

    for (let index = 0; index < 8; index += 1) {
      const marker = `content for section ${index}`;
      expect(chunks.some((chunk) => chunk.includes(marker))).toBe(true);
    }
  });

  it("handles CJK text without splitting mid-sentence where possible", () => {
    const sentence =
      "这是一个用于测试分块的中文句子，包含足够多的汉字以触发分段。";
    const markdown = `# 中文标题\n\n${sentence.repeat(120)}`;
    const chunks = chunkMarkdown(markdown);

    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk boundary should fall on a sentence end, so every chunk
    // either starts at the beginning or with a full sentence.
    for (const chunk of chunks.slice(1)) {
      expect(chunk.startsWith("这是一个")).toBe(true);
    }
  });
});

describe("estimateTokens", () => {
  it("scales with length", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(100))).toBe(25);
  });
});
