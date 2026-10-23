import { readFile } from "node:fs/promises";
import path from "node:path";

const TEAM_LIST_PATH = path.join(process.cwd(), "TEAM-LIST.md");

/** Parses `TEAM-LIST.md` lines like `TOR: Toronto Maple Leafs` into an abbreviation → name map. */
export function parseTeamList(text: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Z]{2,4})\s*:\s*(.+?)\s*$/);
    if (match) names.set(match[1], match[2]);
  }
  return names;
}

export async function loadTeamNames(): Promise<Map<string, string>> {
  try {
    return parseTeamList(await readFile(TEAM_LIST_PATH, "utf8"));
  } catch (error) {
    console.warn(`Could not read ${TEAM_LIST_PATH}; showing abbreviations only.`, error);
    return new Map();
  }
}
