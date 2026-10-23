import { readdir } from "node:fs/promises";
import path from "node:path";

const LOGOS_DIR = path.join(process.cwd(), "public", "logos");

/** Abbreviations that have a logo saved by `npm run fetch-games` at `public/logos/ABBR.svg`. */
export async function loadLogoTeams(): Promise<Set<string>> {
  try {
    const files = await readdir(LOGOS_DIR);
    return new Set(files.filter((name) => name.endsWith(".svg")).map((name) => name.slice(0, -4)));
  } catch {
    // No logos yet (fetch-games not run); the table shows abbreviations only.
    return new Set();
  }
}
