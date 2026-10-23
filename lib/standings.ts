import type { Game, StandingsRow } from "@/types/nhl";

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

/**
 * Keeps only the games that count: completed regular-season games, and for each pair of
 * teams only the first game at each team's home rink (so at most two games per pair).
 */
export function selectCountedGames(games: readonly Game[]): Game[] {
  const seenMatchups = new Set<string>();
  const counted: Game[] = [];
  for (const game of games.filter(isCompletedRegularSeason).sort(compareChronologically)) {
    const matchup = `${game.awayTeam}@${game.homeTeam}`;
    if (seenMatchups.has(matchup)) continue;
    seenMatchups.add(matchup);
    counted.push(game);
  }
  return counted;
}

type Result = { team: string; opponent: string; gf: number; ga: number; outcome: "W" | "L" | "OL" };

function resultsFor(game: Game): [Result, Result] {
  const homeWon = game.homeScore > game.awayScore;
  const loserOutcome = game.periodType === "OT" || game.periodType === "SO" ? "OL" : "L";
  return [
    {
      team: game.homeTeam,
      opponent: game.awayTeam,
      gf: game.homeScore,
      ga: game.awayScore,
      outcome: homeWon ? "W" : loserOutcome,
    },
    {
      team: game.awayTeam,
      opponent: game.homeTeam,
      gf: game.awayScore,
      ga: game.homeScore,
      outcome: homeWon ? loserOutcome : "W",
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
 * Builds the standings table from raw games. Sorted by points, then head-to-head points among
 * the teams tied on points, then goal difference, then goals for, then abbreviation.
 */
export function computeStandings(games: readonly Game[]): StandingsRow[] {
  const results = selectCountedGames(games).flatMap(resultsFor);

  const rows = new Map<string, StandingsRow>();
  for (const r of results) {
    const row =
      rows.get(r.team) ??
      { team: r.team, gp: 0, w: 0, l: 0, ol: 0, pts: 0, gf: 0, ga: 0, diff: 0 };
    row.gp += 1;
    if (r.outcome === "W") row.w += 1;
    else if (r.outcome === "OL") row.ol += 1;
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
          a.team.localeCompare(b.team),
      );
    });
}
