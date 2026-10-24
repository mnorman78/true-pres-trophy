/** How a game ended. Missing means the game is treated as a regulation result. */
export type PeriodType = "REG" | "OT" | "SO";

/** One game as it appears in a daily `data/games/YYYY-MM-DD.json` file. */
export type Game = {
  id: string;
  season: string;
  gameDate: string;
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameState: string;
  gameType: string;
  venue?: string;
  periodType?: PeriodType;
};

/** Shape of a whole daily file. */
export type DailyGamesFile = {
  games: Game[];
};

/** One team's aggregated record, ready to display. */
export type StandingsRow = {
  team: string;
  /** Games counted under the home-and-away rule. */
  gp: number;
  /** All completed regular-season games, counted or not. */
  played: number;
  w: number;
  l: number;
  ol: number;
  pts: number;
  gf: number;
  ga: number;
  diff: number;
  /** Regulation wins (not OT or shootout). Used as a tiebreaker, not displayed. */
  rw: number;
  /** Regulation + overtime wins (all wins except shootout wins). Used as a tiebreaker, not displayed. */
  row: number;
};

/** A completed game that doesn't count toward the standings, from one team's side. */
export type UncountedGame = {
  id: string;
  gameDate: string;
  opponent: string;
  isHome: boolean;
  gf: number;
  ga: number;
  outcome: "W" | "L" | "OL";
  period: PeriodType;
  /** Date of the earlier game with the same home and away team, which counts instead. */
  countedGameDate: string;
};

/** `data/season.json`, written by the fetch script next to the daily game files. */
export type SeasonInfo = {
  season: string;
  regularSeasonEndDate: string;
  /** Every game of the regular season has finished, so the data won't change any more. */
  complete: boolean;
};
