import { readFile } from "node:fs/promises";
import path from "node:path";

const FAQ_PATH = path.join(process.cwd(), "FAQ.md");

export type FaqBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "ordered" | "bullets"; items: string[] };

export type FaqEntry = { question: string; blocks: FaqBlock[] };

/**
 * Parses `FAQ.md`: each `## ` heading is a question, and the lines under it are its answer, made of
 * paragraphs, numbered lists (`1. `) and bullet lists (`- `). HTML comments and anything before the
 * first question are ignored.
 */
export function parseFaq(text: string): FaqEntry[] {
  const entries: FaqEntry[] = [];
  let block: FaqBlock | undefined;

  for (const line of text.replace(/<!--[\s\S]*?-->/g, "").split("\n").map((l) => l.trim())) {
    const question = line.match(/^##\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const entry = entries.at(-1);

    if (question) {
      entries.push({ question: question[1], blocks: [] });
      block = undefined;
    } else if (!entry || line === "" || line.startsWith("#")) {
      block = undefined;
    } else if (ordered || bullet) {
      const kind = ordered ? "ordered" : "bullets";
      if (block?.kind !== kind) {
        block = { kind, items: [] };
        entry.blocks.push(block);
      }
      block.items.push((ordered ?? bullet)![1]);
    } else if (block?.kind === "paragraph") {
      block.text += ` ${line}`;
    } else {
      block = { kind: "paragraph", text: line };
      entry.blocks.push(block);
    }
  }
  return entries;
}

export async function loadFaq(): Promise<FaqEntry[]> {
  try {
    return parseFaq(await readFile(FAQ_PATH, "utf8"));
  } catch (error) {
    console.warn(`Could not read ${FAQ_PATH}; leaving out the FAQ.`, error);
    return [];
  }
}
