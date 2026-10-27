import { StickyHeaderTable } from "@/app/sticky-header-table";
import { TeamRow } from "@/app/team-row";
import Image from "next/image";
import type { ReactNode } from "react";
import { computeStandings, selectCountedGames, selectUncountedGames } from "@/lib/standings";
import type { Game, StandingsRow, UncountedGame } from "@/types/nhl";

const STAT_HEADINGS = ["PTS", "GC", "GP", "W", "L", "OL", "DIFF"] as const;

function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${Math.abs(diff)}`;
  return "0";
}

/** "20252026" → "2025–26" */
export function formatSeason(season: string): string {
  return /^\d{8}$/.test(season) ? `${season.slice(0, 4)}–${season.slice(6)}` : season;
}

export function formatGameDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function seasonNote(counted: readonly Game[], rows: readonly StandingsRow[]) {
  if (counted.length === 0) return null;
  const latest = counted[counted.length - 1];
  // Every club plays each opponent once at home and once away when the season is complete.
  const isComplete = rows.every((row) => row.gp === 2 * (rows.length - 1));
  return {
    season: `${formatSeason(latest.season)} regular season`,
    status: isComplete ? "Final standings" : `Through ${formatGameDate(latest.gameDate)}`,
  };
}

/** "Final standings · last game Apr 10, 2027", for a season whose games are all final. */
export function finalStandingsLine(games: readonly Game[]): string {
  const lastGameDate = games.reduce((latest, game) => (game.gameDate > latest ? game.gameDate : latest), "");
  return `Final standings · last game ${formatGameDate(lastGameDate)}`;
}

function SectionHeading({ title, note, updated }: {
  title: string;
  note: { season: string; status: string } | null;
  updated: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 id="standings-title" className="font-serif text-3xl tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mt-1 text-[11px] text-[#777064]">{updated}</p>
      </div>
      {note && (
        <p className="hidden text-right text-xs leading-relaxed text-[#6e685c] sm:block">
          {note.season}
          <br />
          {note.status}
        </p>
      )}
    </div>
  );
}

/** Both copies of the table (sticky header, body) share this layout so their columns line up. */
const TABLE_CLASS = "w-full min-w-[440px] table-fixed border-collapse text-sm tabular-nums";

function TableColumns() {
  return (
    <colgroup>
      <col className="w-14 max-sm:w-12" />
      <col className="w-28 sm:w-72" />
      {STAT_HEADINGS.map((heading) => (
        <col key={heading} />
      ))}
    </colgroup>
  );
}

/** The column headings; `srOnly` keeps them for screen readers but takes up no height. */
function HeaderRow({ srOnly = false }: { srOnly?: boolean }) {
  if (srOnly) {
    return (
      <tr>
        {["RK", "Club", ...STAT_HEADINGS].map((heading) => (
          <th key={heading} scope="col" className="p-0">
            <span className="sr-only">{heading}</span>
          </th>
        ))}
      </tr>
    );
  }
  return (
    <tr className="bg-[#17211d] text-[#f2ead9]">
      <th
        scope="col"
        className="relative z-10 translate-x-(--scroll-x) bg-inherit px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]"
      >
        RK
      </th>
      <th
        scope="col"
        className="relative z-10 translate-x-(--scroll-x) bg-inherit max-sm:shadow-[inset_-1px_0_0_#c9beaa] px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]"
      >
        Club
      </th>
      {STAT_HEADINGS.map((heading) => (
        <th
          key={heading}
          scope="col"
          className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em]"
        >
          {heading}
        </th>
      ))}
    </tr>
  );
}

/** "2026-10-11" → "Oct 11" */
function formatShortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The panel under a team's row: its completed games that don't count, and why. */
function UncountedGames({ team, games, complete }: {
  team: string;
  games: readonly UncountedGame[];
  complete: boolean;
}) {
  if (games.length === 0) {
    return (
      <p className="text-xs text-[#615c52]">
        {complete ? `Every ${team} game counted.` : `Every ${team} game so far has counted.`}
      </p>
    );
  }
  return (
    <>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#9e3028]">
        {games.length === 1 ? "1 game not counted" : `${games.length} games not counted`}
      </p>
      <ul className="space-y-1.5 text-xs leading-snug text-[#35403b]">
        {games.map((game) => (
          <li key={game.id} className="sm:flex sm:gap-3">
            <span className="inline-block w-12 font-semibold tabular-nums sm:shrink-0">
              {formatShortDate(game.gameDate)}
            </span>
            <span className="inline-block w-14 sm:shrink-0">
              {game.isHome ? "vs" : "@"} {game.opponent}
            </span>
            <span className="inline-block tabular-nums sm:w-24 sm:shrink-0">
              {game.outcome} {game.gf}–{game.ga}
              {game.period !== "REG" && ` ${game.period}`}
            </span>
            <span className="block text-[#777064] max-sm:pl-12 sm:inline">
              {game.isHome
                ? `Already hosted ${game.opponent} on ${formatShortDate(game.countedGameDate)}`
                : `Already played at ${game.opponent} on ${formatShortDate(game.countedGameDate)}`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Heading, standings table and legend for one season's games. Used by the home page (current season)
 * and the season archive pages.
 */
export function StandingsSection({
  title,
  updated,
  games,
  complete,
  teamNames,
  logoTeams,
  presidentsTrophyWinner,
  belowTable,
  tightTop = false,
}: {
  title: string;
  /** Fine print under the title. */
  updated: string;
  games: readonly Game[];
  /** Every game of the regular season is final. */
  complete: boolean;
  teamNames: ReadonlyMap<string, string>;
  logoTeams: ReadonlySet<string>;
  /** Club that won the NHL's Presidents' Trophy, marked with an asterisk (past seasons only). */
  presidentsTrophyWinner?: string;
  /** Shown between the table and the legend. */
  belowTable?: ReactNode;
  /** Less space above the heading, for when a link already sits just above it. */
  tightTop?: boolean;
}) {
  const counted = selectCountedGames(games);
  const rows = computeStandings(games);
  const uncounted = selectUncountedGames(games);

  return (
    <section className={tightTop ? "pt-3" : "pt-8 sm:pt-10"} aria-labelledby="standings-title">
      <SectionHeading title={title} note={seasonNote(counted, rows)} updated={updated} />

      <StickyHeaderTable
        header={
          <table className={TABLE_CLASS}>
            <TableColumns />
            <thead>
              <HeaderRow />
            </thead>
          </table>
        }
      >
        {/* Fixed layout: RK and Club keep their widths and the stat columns share the rest equally. */}
        <table className={TABLE_CLASS}>
          <TableColumns />
          {/* The visible header is the sticky copy above; this one is for screen readers. */}
          <thead>
            <HeaderRow srOnly />
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2 + STAT_HEADINGS.length} className="px-3 py-8 text-center text-[#6e685c]">
                  No completed regular-season games found in <code>data/games/</code>.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <TeamRow
                  key={row.team}
                  team={row.team}
                  columnCount={2 + STAT_HEADINGS.length}
                  rank={String(index + 1).padStart(2, "0")}
                  club={
                    <span className="flex items-center">
                      {/* NHL logos share a 960×640 canvas, so a 3:2 box sizes them all alike. */}
                      <span className="mr-2 inline-block h-5 w-[30px] shrink-0">
                        {logoTeams.has(row.team) && (
                          <Image
                            src={`/logos/${row.team}.svg`}
                            alt=""
                            width={30}
                            height={20}
                            unoptimized
                          />
                        )}
                      </span>
                      <span className="mr-4 inline-block w-8 shrink-0 text-[10px] font-bold tracking-[0.1em] text-[#9e3028] max-sm:mr-0">
                        {row.team}
                        {row.team === presidentsTrophyWinner && (
                          <>
                            <span aria-hidden="true">*</span>
                            <span className="sr-only"> (won the NHL’s Presidents’ Trophy)</span>
                          </>
                        )}
                      </span>
                      {/* Phones show only the abbreviation; the name stays available to screen readers. */}
                      <span className="max-sm:sr-only">{teamNames.get(row.team) ?? row.team}</span>
                    </span>
                  }
                  stats={
                    <>
                      <td className="px-3 py-3 text-right font-bold text-[#17211d]">{row.pts}</td>
                      <td className="px-3 py-3 text-right text-[#615c52]">{row.gp}</td>
                      <td className="px-3 py-3 text-right text-[#615c52]">{row.played}</td>
                      <td className="px-3 py-3 text-right text-[#615c52]">{row.w}</td>
                      <td className="px-3 py-3 text-right text-[#615c52]">{row.l}</td>
                      <td className="px-3 py-3 text-right text-[#615c52]">{row.ol}</td>
                      <td className="px-3 py-3 text-right text-[#615c52]">{formatDiff(row.diff)}</td>
                    </>
                  }
                  details={
                    <UncountedGames team={row.team} games={uncounted.get(row.team) ?? []} complete={complete} />
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </StickyHeaderTable>

      {belowTable}
      <footer className="flex flex-col gap-2 py-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777064] sm:flex-row sm:justify-between">
        <p>PTS Points · GC Games counted · GP Games played · W Wins · L Losses · OL Overtime losses · DIFF Goal differential</p>
        <p>PTS = 2 × W + OL</p>
      </footer>
    </section>
  );
}
