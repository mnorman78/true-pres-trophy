/**
 * Rebuilds `data/games/` from the NHL's public schedule API.
 *
 * Usage: `npm run fetch-games [-- YYYY-MM-DD]`. Fetches the regular season containing the given
 * date (default: today, UTC) from opening night through that date's week, checks the data, and
 * only then replaces every `.json` file in `data/games/` with one file per game date. Exits
 * non-zero without touching `data/games/` if the API shape changed or a check fails.
 *
 * Until a game of that season has finished (offseason, preseason, opening day), it fetches the
 * previous regular season instead, so the finished season stays up until the new one has results.
 * It also writes `data/season.json`, which says whether the fetched regular season is complete,
 * and once it is, saves it to `data/seasons/YYYY-YY.json` (if not already there) for the archive.
 *
 * Also saves each team's current logo to `public/logos/ABBR.svg`. A logo that fails to download
 * is skipped with a warning (the page then shows just the abbreviation); it never fails the run.
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { archiveSeason, seasonSlug } from "../lib/seasons.ts";
import { parseTeamList } from "../lib/teams.ts";
import type { Game, PeriodType, SeasonInfo } from "@/types/nhl";

const API_BASE = "https://api-web.nhle.com/v1";
const GAMES_DIR = path.join(process.cwd(), "data", "games");
const TEAM_LIST_PATH = path.join(process.cwd(), "TEAM-LIST.md");
const LOGOS_DIR = path.join(process.cwd(), "public", "logos");
const SEASON_INFO_PATH = path.join(process.cwd(), "data", "season.json");
const REGULAR_SEASON = 2;
const FINAL_STATES = new Set(["FINAL", "OFF"]);
const PERIOD_TYPES: readonly PeriodType[] = ["REG", "OT", "SO"];
// 84 from 2026–27 on (82 before); used as a ceiling, so it also covers older seasons.
const GAMES_PER_SEASON = 84;

type ApiTeam = { abbrev: string; score?: number; logo?: string };
type ApiGame = {
  id: number;
  season: number;
  gameType: number;
  gameState: string;
  startTimeUTC: string;
  venue?: { default?: string };
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  periodDescriptor?: { periodType?: string };
};
type ApiSchedule = {
  nextStartDate?: string;
  regularSeasonStartDate: string;
  regularSeasonEndDate: string;
  gameWeek: { date: string; games: ApiGame[] }[];
};

type ApiSeasons = { seasons: { standingsEnd?: unknown }[] };

class DataError extends Error {}

function isApiTeam(value: unknown): value is ApiTeam {
  const t = value as Record<string, unknown> | null;
  return (
    typeof t?.abbrev === "string" &&
    (t.score === undefined || typeof t.score === "number") &&
    (t.logo === undefined || typeof t.logo === "string")
  );
}

function isApiGame(value: unknown): value is ApiGame {
  const g = value as Record<string, unknown> | null;
  return (
    typeof g?.id === "number" &&
    typeof g.season === "number" &&
    typeof g.gameType === "number" &&
    typeof g.gameState === "string" &&
    typeof g.startTimeUTC === "string" &&
    isApiTeam(g.homeTeam) &&
    isApiTeam(g.awayTeam)
  );
}

async function fetchSchedule(date: string): Promise<ApiSchedule> {
  const url = `${API_BASE}/schedule/${date}`;
  const response = await fetch(url);
  if (!response.ok) throw new DataError(`${url} returned HTTP ${response.status}.`);
  const body = (await response.json()) as Partial<ApiSchedule>;
  if (
    typeof body.regularSeasonStartDate !== "string" ||
    typeof body.regularSeasonEndDate !== "string" ||
    !Array.isArray(body.gameWeek)
  ) {
    throw new DataError(`${url} no longer has the expected schedule shape.`);
  }
  return body as ApiSchedule;
}

/** Last day of the latest regular season that ended before `seasonStart`. */
async function previousSeasonEnd(seasonStart: string): Promise<string> {
  const url = `${API_BASE}/standings-season`;
  const response = await fetch(url);
  if (!response.ok) throw new DataError(`${url} returned HTTP ${response.status}.`);
  const body = (await response.json()) as Partial<ApiSeasons>;
  if (!Array.isArray(body.seasons)) throw new DataError(`${url} no longer has the expected shape.`);
  const ends = body.seasons
    .map((season) => season.standingsEnd)
    .filter((end): end is string => typeof end === "string" && end < seasonStart)
    .sort();
  if (ends.length === 0) throw new DataError(`${url} lists no season that ended before ${seasonStart}.`);
  return ends[ends.length - 1];
}

/** Converts one API game into the app's `Game` shape. */
function toGame(raw: ApiGame, gameDate: string): Game {
  const isFinal = FINAL_STATES.has(raw.gameState);
  const periodType = raw.periodDescriptor?.periodType;
  return {
    id: String(raw.id),
    season: String(raw.season),
    gameDate,
    startTime: raw.startTimeUTC,
    homeTeam: raw.homeTeam.abbrev,
    awayTeam: raw.awayTeam.abbrev,
    homeScore: raw.homeTeam.score ?? 0,
    awayScore: raw.awayTeam.score ?? 0,
    gameState: raw.gameState,
    gameType: "regular",
    ...(raw.venue?.default && { venue: raw.venue.default }),
    ...(isFinal && periodType && { periodType: periodType as PeriodType }),
  };
}

/**
 * Every regular-season game from opening night through the week containing `throughDate`, plus
 * each team's logo URL as of its latest game in that range.
 */
async function fetchSeason(throughDate: string): Promise<{
  games: Game[];
  logos: Map<string, string>;
  startDate: string;
  endDate: string;
}> {
  const first = await fetchSchedule(throughDate);
  const games: Game[] = [];
  const logos = new Map<string, string>();
  let weekStart: string | undefined = first.regularSeasonStartDate;
  while (weekStart && weekStart <= throughDate && weekStart <= first.regularSeasonEndDate) {
    const schedule = await fetchSchedule(weekStart);
    for (const day of schedule.gameWeek) {
      for (const raw of day.games) {
        if (!isApiGame(raw)) {
          throw new DataError(`A game on ${day.date} no longer has the expected shape.`);
        }
        if (raw.gameType !== REGULAR_SEASON) continue;
        games.push(toGame(raw, day.date));
        for (const team of [raw.homeTeam, raw.awayTeam]) {
          if (team.logo) logos.set(team.abbrev, team.logo);
        }
      }
    }
    weekStart = schedule.nextStartDate;
  }
  return {
    games,
    logos,
    startDate: first.regularSeasonStartDate,
    endDate: first.regularSeasonEndDate,
  };
}

/** Returns a list of problems; an empty list means the data is safe to publish. */
function checkGames(games: readonly Game[], knownTeams: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();
  const gamesPerTeam = new Map<string, number>();

  for (const game of games) {
    const label = `Game ${game.id} (${game.awayTeam} @ ${game.homeTeam}, ${game.gameDate})`;
    if (seenIds.has(game.id)) problems.push(`${label} appears more than once.`);
    seenIds.add(game.id);

    for (const team of [game.homeTeam, game.awayTeam]) {
      if (!knownTeams.has(team)) problems.push(`${label}: ${team} is not in TEAM-LIST.md.`);
      gamesPerTeam.set(team, (gamesPerTeam.get(team) ?? 0) + 1);
    }
    if (game.homeTeam === game.awayTeam) problems.push(`${label}: a team is playing itself.`);

    if (FINAL_STATES.has(game.gameState)) {
      if (game.homeScore === game.awayScore) {
        problems.push(`${label}: final score is tied ${game.homeScore}–${game.awayScore}.`);
      }
      if (!game.periodType || !PERIOD_TYPES.includes(game.periodType)) {
        problems.push(`${label}: final game has no REG/OT/SO period type.`);
      }
    }
  }

  for (const [team, count] of gamesPerTeam) {
    if (count > GAMES_PER_SEASON) {
      problems.push(`${team} has ${count} regular-season games (max ${GAMES_PER_SEASON}).`);
    }
  }
  return problems;
}

/** Replaces every `.json` file in `data/games/` with one `YYYY-MM-DD.json` per game date. */
async function writeDailyFiles(games: readonly Game[]): Promise<number> {
  const byDate = new Map<string, Game[]>();
  for (const game of games) byDate.set(game.gameDate, [...(byDate.get(game.gameDate) ?? []), game]);

  await mkdir(GAMES_DIR, { recursive: true });
  const stale = (await readdir(GAMES_DIR)).filter((name) => name.endsWith(".json"));
  await Promise.all(stale.map((name) => rm(path.join(GAMES_DIR, name))));
  await Promise.all(
    [...byDate].map(([date, dayGames]) =>
      writeFile(
        path.join(GAMES_DIR, `${date}.json`),
        `${JSON.stringify({ games: dayGames }, null, 2)}\n`,
      ),
    ),
  );
  return byDate.size;
}

/** Replaces `public/logos/` with one `ABBR.svg` per team; returns how many were saved. */
async function writeLogos(logos: ReadonlyMap<string, string>): Promise<number> {
  await rm(LOGOS_DIR, { recursive: true, force: true });
  await mkdir(LOGOS_DIR, { recursive: true });
  const saved = await Promise.all(
    [...logos].map(async ([team, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const svg = await response.text();
        // The file is served from our own origin, so refuse anything that isn't a plain SVG.
        if (!/<svg[\s>]/.test(svg) || /<script|\son\w+\s*=/i.test(svg)) {
          throw new Error("not a plain SVG");
        }
        await writeFile(path.join(LOGOS_DIR, `${team}.svg`), svg);
        return true;
      } catch (error) {
        console.warn(`Skipping ${team} logo from ${url}: ${(error as Error).message}`);
        return false;
      }
    }),
  );
  return saved.filter(Boolean).length;
}

async function main() {
  const throughDate = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(throughDate)) {
    throw new DataError(`Expected a date like 2026-10-23, got "${throughDate}".`);
  }

  const knownTeams = new Set(parseTeamList(await readFile(TEAM_LIST_PATH, "utf8")).keys());
  let fetchedThrough = throughDate;
  let season = await fetchSeason(fetchedThrough);
  if (!season.games.some((game) => FINAL_STATES.has(game.gameState))) {
    fetchedThrough = await previousSeasonEnd(season.startDate);
    console.log(
      `No regular-season game has finished in the season starting ${season.startDate}; ` +
        `fetching the season that ended ${fetchedThrough} instead.`,
    );
    season = await fetchSeason(fetchedThrough);
  }
  const { games, logos } = season;
  if (games.length === 0) throw new DataError(`No regular-season games found through ${fetchedThrough}.`);

  const problems = checkGames(games, knownTeams);
  if (problems.length > 0) {
    throw new DataError(
      `Found ${problems.length} problem(s); data/games/ was not changed.\n- ${problems.join("\n- ")}`,
    );
  }

  const fileCount = await writeDailyFiles(games);
  // Complete once the whole schedule was fetched and every game in it has finished.
  const seasonInfo: SeasonInfo = {
    season: games[0].season,
    regularSeasonEndDate: season.endDate,
    complete:
      fetchedThrough >= season.endDate && games.every((game) => FINAL_STATES.has(game.gameState)),
  };
  await writeFile(SEASON_INFO_PATH, `${JSON.stringify(seasonInfo, null, 2)}\n`);
  const finals = games.filter((game) => FINAL_STATES.has(game.gameState)).length;
  console.log(
    `Wrote ${games.length} games (${finals} final) to ${fileCount} files in data/games/` +
      (seasonInfo.complete ? "; the regular season is complete." : "."),
  );
  if (seasonInfo.complete && (await archiveSeason(seasonInfo.season, games))) {
    console.log(`Archived the finished season to data/seasons/${seasonSlug(seasonInfo.season)}.json.`);
  }
  const logoCount = await writeLogos(logos);
  console.log(`Saved ${logoCount} of ${logos.size} team logos to public/logos/.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof DataError ? error.message : error);
  process.exitCode = 1;
});
