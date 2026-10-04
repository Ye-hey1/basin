// Markdown-aware chunker for Brain indexing. Sections (heading-delimited) are
// kept intact whenever possible so a chunk never splits mid-topic; oversized
// sections fall back to paragraph packing with a small character overlap.
// Sizes are in characters (~4 chars per token for mixed CJK/Latin text):
// target ≈ 450 tokens, cap ≈ 550 tokens.

const CHUNK_TARGET_CHARS = 1800;
const CHUNK_MAX_CHARS = 2400;
const CHUNK_OVERLAP_CHARS = 200;

function splitSections(markdown: string): string[] {
  const lines = markdown.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) {
    sections.push(current.join("\n").trim());
  }

  return sections.filter((section) => section.length > 0);
}

function hardSplit(text: string): string[] {
  const pieces: string[] = [];
  // Prefer sentence boundaries so the overlap does not cut mid-word.
  const sentences = text.split(/(?<=[.。!？!?;；])\s*/);
  let current = "";

  const push = () => {
    if (current.trim().length > 0) {
      pieces.push(current.trim());
    }
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > CHUNK_MAX_CHARS) {
      push();
      for (
        let offset = 0;
        offset < sentence.length;
        offset += CHUNK_MAX_CHARS
      ) {
        pieces.push(sentence.slice(offset, offset + CHUNK_MAX_CHARS).trim());
      }
      continue;
    }
    if (current.length + sentence.length > CHUNK_TARGET_CHARS) {
      push();
    }
    current += (current ? " " : "") + sentence;
  }
  push();

  return pieces.filter((piece) => piece.length > 0);
}

function chunkSection(section: string): string[] {
  if (section.length <= CHUNK_MAX_CHARS) {
    return [section];
  }

  const paragraphs = section.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_MAX_CHARS) {
      if (current.trim().length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...hardSplit(paragraph));
      continue;
    }
    if (current.length + paragraph.length + 2 > CHUNK_TARGET_CHARS) {
      chunks.push(current.trim());
      // Overlap: repeat the tail of the previous chunk so local context
      // survives the boundary. Sections short enough to fit whole never
      // pay this cost.
      const tail = current.trim().slice(-CHUNK_OVERLAP_CHARS);
      current = tail ? `${tail}\n\n` : "";
    }
    current += paragraph;
    current += "\n\n";
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

export function chunkMarkdown(markdown: string): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) {
    return [];
  }
  if (normalized.length <= CHUNK_TARGET_CHARS) {
    return [normalized];
  }

  const sections = splitSections(normalized);
  const chunks = sections.flatMap(chunkSection);
  return chunks.filter((chunk) => chunk.length > 0);
}

// Rough token estimate for metering/logging; not a tokenizer.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
