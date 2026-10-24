import type { Game, PeriodType, StandingsRow, UncountedGame } from "@/types/nhl";

const FINAL_STATES = new Set(["FINAL", "OFF"]);

function isCompletedRegularSeason(game: Game): boolean {
  return (
    FINAL_STATES.has(game.gameState.toUpperCase()) &&
    game.gameType.toLowerCase() === "regular" &&
    game.homeTeam !== game.awayTeam &&
    game.homeScore !== game.awayScore
  );
}

function compareChronologically(a: Game, b: Game): number {
  return (
    a.gameDate.localeCompare(b.gameDate) ||
    a.startTime.localeCompare(b.startTime) ||
    a.id.localeCompare(b.id)
  );
}

/** Splits completed regular-season games into those that count and the repeats of a counted matchup. */
function partitionByMatchup(games: readonly Game[]): {
  counted: Game[];
  repeats: { game: Game; countedGame: Game }[];
} {
  const firstByMatchup = new Map<string, Game>();
  const counted: Game[] = [];
  const repeats: { game: Game; countedGame: Game }[] = [];
  for (const game of games.filter(isCompletedRegularSeason).sort(compareChronologically)) {
    const matchup = `${game.awayTeam}@${game.homeTeam}`;
    const countedGame = firstByMatchup.get(matchup);
    if (countedGame) {
      repeats.push({ game, countedGame });
    } else {
      firstByMatchup.set(matchup, game);
      counted.push(game);
    }
  }
  return { counted, repeats };
}

/**
 * Keeps only the games that count: completed regular-season games, and for each pair of
 * teams only the first game with each team as the designated home team (so at most two games per
 * pair). Neutral-site games count for their designated home team, as in the NHL.
 */
export function selectCountedGames(games: readonly Game[]): Game[] {
  return partitionByMatchup(games).counted;
}

type Result = {
  team: string;
  opponent: string;
  gf: number;
  ga: number;
  outcome: "W" | "L" | "OL";
  /** How the game ended; a game without `periodType` counts as a regulation result. */
  period: PeriodType;
};

function resultsFor(game: Game): [Result, Result] {
  const homeWon = game.homeScore > game.awayScore;
  const period = game.periodType ?? "REG";
  const loserOutcome = period === "OT" || period === "SO" ? "OL" : "L";
  return [
    {
      team: game.homeTeam,
      opponent: game.awayTeam,
      gf: game.homeScore,
      ga: game.awayScore,
      outcome: homeWon ? "W" : loserOutcome,
      period,
    },
    {
      team: game.awayTeam,
      opponent: game.homeTeam,
      gf: game.awayScore,
      ga: game.homeScore,
      outcome: homeWon ? loserOutcome : "W",
      period,
    },
  ];
}

function pointsFor(outcome: Result["outcome"]): number {
  return outcome === "W" ? 2 : outcome === "OL" ? 1 : 0;
}

/**
 * Head-to-head points each team in `tied` earned in counted games against the other teams in `tied`.
 */
function headToHeadPoints(tied: readonly string[], results: readonly Result[]): Map<string, number> {
  const group = new Set(tied);
  const points = new Map(tied.map((team) => [team, 0]));
  for (const r of results) {
    if (group.has(r.team) && group.has(r.opponent)) {
      points.set(r.team, (points.get(r.team) ?? 0) + pointsFor(r.outcome));
    }
  }
  return points;
}

/**
 * Builds the standings table from raw games. Sorted by points, then among teams tied on points by
 * head-to-head points, goal difference, goals for, regulation wins, regulation + overtime wins,
 * total wins, and finally abbreviation (only so the order is stable; not a published tiebreaker).
 * Keep the tiebreaker list in app/page.tsx in step with this order.
 */
export function computeStandings(games: readonly Game[]): StandingsRow[] {
  const results = selectCountedGames(games).flatMap(resultsFor);

  const played = new Map<string, number>();
  for (const game of games.filter(isCompletedRegularSeason)) {
    for (const team of [game.homeTeam, game.awayTeam]) played.set(team, (played.get(team) ?? 0) + 1);
  }

  const rows = new Map<string, StandingsRow>();
  for (const r of results) {
    const row =
      rows.get(r.team) ??
      {
        team: r.team,
        gp: 0,
        played: played.get(r.team) ?? 0,
        w: 0, l: 0, ol: 0, pts: 0, gf: 0, ga: 0, diff: 0, rw: 0, row: 0,
      };
    row.gp += 1;
    if (r.outcome === "W") {
      row.w += 1;
      if (r.period === "REG") row.rw += 1;
      if (r.period !== "SO") row.row += 1;
    } else if (r.outcome === "OL") row.ol += 1;
    else row.l += 1;
    row.pts += pointsFor(r.outcome);
    row.gf += r.gf;
    row.ga += r.ga;
    row.diff = row.gf - row.ga;
    rows.set(r.team, row);
  }

  const byPoints = new Map<number, StandingsRow[]>();
  for (const row of rows.values()) {
    byPoints.set(row.pts, [...(byPoints.get(row.pts) ?? []), row]);
  }

  return [...byPoints.keys()]
    .sort((a, b) => b - a)
    .flatMap((pts) => {
      const tied = byPoints.get(pts)!;
      const h2h = headToHeadPoints(
        tied.map((row) => row.team),
        results,
      );
      return [...tied].sort(
        (a, b) =>
          h2h.get(b.team)! - h2h.get(a.team)! ||
          b.diff - a.diff ||
          b.gf - a.gf ||
          b.rw - a.rw ||
          b.row - a.row ||
          b.w - a.w ||
          a.team.localeCompare(b.team),
      );
    });
}

/**
 * Each team's completed regular-season games that don't count, oldest first: repeats of a matchup
 * (same home and away team) that already counted earlier in the season.
 */
export function selectUncountedGames(games: readonly Game[]): Map<string, UncountedGame[]> {
  const byTeam = new Map<string, UncountedGame[]>();
  for (const { game, countedGame } of partitionByMatchup(games).repeats) {
    for (const r of resultsFor(game)) {
      const list = byTeam.get(r.team) ?? [];
      list.push({
        id: game.id,
        gameDate: game.gameDate,
        opponent: r.opponent,
        isHome: r.team === game.homeTeam,
        gf: r.gf,
        ga: r.ga,
        outcome: r.outcome,
        period: r.period,
        countedGameDate: countedGame.gameDate,
      });
      byTeam.set(r.team, list);
    }
  }
  return byTeam;
}
