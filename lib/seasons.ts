import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Game } from "@/types/nhl";
import { isGame } from "./games-loader.ts";

/**
 * Finished regular seasons, one committed `data/seasons/YYYY-YY.json` file each, holding every
 * regular-season game. The fetch script writes a season's file once it's complete; each file is
 * built into its own page at `/seasons/YYYY-YY`.
 */
const SEASONS_DIR = path.join(process.cwd(), "data", "seasons");

export type ArchivedSeason = { slug: string; season: string; games: Game[] };

/** "20252026" → "2025-26", the archive file name and URL segment. */
export function seasonSlug(season: string): string {
  return /^\d{8}$/.test(season) ? `${season.slice(0, 4)}-${season.slice(6)}` : season;
}

/** "2025-26" → "2025–26" (en dash), for display. */
export function seasonTitle(slug: string): string {
  return slug.replace("-", "–");
}

function archivePath(slug: string): string {
  return path.join(SEASONS_DIR, `${slug}.json`);
}

/**
 * Saves a finished season unless it's already archived; returns whether a file was written. One
 * game per line, oldest first, so the committed file reads and diffs cleanly.
 */
export async function archiveSeason(season: string, games: readonly Game[]): Promise<boolean> {
  const file = archivePath(seasonSlug(season));
  try {
    await readFile(file);
    return false;
  } catch {
    // Not archived yet.
  }
  const sorted = [...games].sort(
    (a, b) => a.gameDate.localeCompare(b.gameDate) || a.startTime.localeCompare(b.startTime),
  );
  const lines = sorted.map((game) => `    ${JSON.stringify(game)}`).join(",\n");
  await mkdir(SEASONS_DIR, { recursive: true });
  await writeFile(file, `{\n  "season": ${JSON.stringify(season)},\n  "games": [\n${lines}\n  ]\n}\n`);
  return true;
}

/** Archived season slugs, newest first. */
export async function listArchivedSeasons(): Promise<string[]> {
  try {
    return (await readdir(SEASONS_DIR))
      .filter((name) => /^\d{4}-\d{2}\.json$/.test(name))
      .map((name) => name.slice(0, -".json".length))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function loadArchivedSeason(slug: string): Promise<ArchivedSeason> {
  const parsed = JSON.parse(await readFile(archivePath(slug), "utf8")) as {
    season?: unknown;
    games?: unknown;
  };
  if (typeof parsed.season !== "string" || !Array.isArray(parsed.games)) {
    throw new Error(`${archivePath(slug)} doesn't have the expected shape.`);
  }
  // Committed files should be clean; fail the build rather than publish a season with games missing.
  const bad = parsed.games.filter((game) => !isGame(game)).length;
  if (bad > 0) throw new Error(`${archivePath(slug)} has ${bad} malformed game(s).`);
  return { slug, season: parsed.season, games: parsed.games as Game[] };
}
