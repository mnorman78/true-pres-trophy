import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Game, PeriodType, SeasonInfo } from "@/types/nhl";

const GAMES_DIR = path.join(process.cwd(), "data", "games");
const SEASON_INFO_PATH = path.join(process.cwd(), "data", "season.json");
const PERIOD_TYPES: readonly PeriodType[] = ["REG", "OT", "SO"];

function isGame(value: unknown): value is Game {
  if (typeof value !== "object" || value === null) return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.id === "string" &&
    typeof g.season === "string" &&
    typeof g.gameDate === "string" &&
    typeof g.startTime === "string" &&
    typeof g.homeTeam === "string" &&
    typeof g.awayTeam === "string" &&
    typeof g.homeScore === "number" &&
    typeof g.awayScore === "number" &&
    typeof g.gameState === "string" &&
    typeof g.gameType === "string" &&
    (g.periodType === undefined || PERIOD_TYPES.includes(g.periodType as PeriodType))
  );
}

/** Reads every `.json` file in `data/games/` and returns all valid games, skipping bad files and entries. */
export async function loadGames(): Promise<Game[]> {
  let fileNames: string[];
  try {
    fileNames = await readdir(GAMES_DIR);
  } catch (error) {
    console.warn(`Could not read ${GAMES_DIR}; no games loaded.`, error);
    return [];
  }

  const jsonFiles = fileNames.filter((name) => name.endsWith(".json")).sort();
  const perFile = await Promise.all(
    jsonFiles.map(async (name): Promise<Game[]> => {
      const filePath = path.join(GAMES_DIR, name);
      try {
        const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
        const games = (parsed as { games?: unknown })?.games;
        if (!Array.isArray(games)) {
          console.warn(`Skipping ${name}: expected a top-level "games" array.`);
          return [];
        }
        const valid = games.filter(isGame);
        if (valid.length < games.length) {
          console.warn(`Skipping ${games.length - valid.length} malformed game(s) in ${name}.`);
        }
        return valid;
      } catch (error) {
        console.warn(`Skipping ${name}: could not parse JSON.`, error);
        return [];
      }
    }),
  );

  // The same game may appear in more than one file; keep the first copy of each id.
  const byId = new Map<string, Game>();
  for (const game of perFile.flat()) {
    if (!byId.has(game.id)) byId.set(game.id, game);
  }
  return [...byId.values()];
}

/** Reads `data/season.json`; returns null when it's missing or malformed (e.g. hand-made test data). */
export async function loadSeasonInfo(): Promise<SeasonInfo | null> {
  try {
    const parsed = JSON.parse(await readFile(SEASON_INFO_PATH, "utf8")) as Partial<SeasonInfo>;
    if (
      typeof parsed.season !== "string" ||
      typeof parsed.regularSeasonEndDate !== "string" ||
      typeof parsed.complete !== "boolean"
    ) {
      console.warn(`Ignoring ${SEASON_INFO_PATH}: unexpected shape.`);
      return null;
    }
    return parsed as SeasonInfo;
  } catch {
    return null;
  }
}
