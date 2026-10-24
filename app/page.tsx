import { Intro } from "@/app/intro";
import { TeamRow } from "@/app/team-row";
import Image from "next/image";
import { loadFaq, type FaqBlock } from "@/lib/faq";
import { loadGames } from "@/lib/games-loader";
import { loadLogoTeams } from "@/lib/logos";
import { computeStandings, selectCountedGames, selectUncountedGames } from "@/lib/standings";
import { loadTeamNames } from "@/lib/teams";
import type { Game, StandingsRow, UncountedGame } from "@/types/nhl";

const STAT_HEADINGS = ["PTS", "GC", "GP", "W", "L", "OL", "DIFF"] as const;

function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${Math.abs(diff)}`;
  return "0";
}

/** "20252026" → "2025–26" */
function formatSeason(season: string): string {
  return /^\d{8}$/.test(season) ? `${season.slice(0, 4)}–${season.slice(6)}` : season;
}

function formatGameDate(date: string): string {
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

function SectionHeading({ clubCount, note }: {
  clubCount: number;
  note: { season: string; status: string } | null;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9e3028]">
          {`All ${clubCount} clubs`}
        </p>
        <h2 id="standings-title" className="font-serif text-3xl tracking-tight sm:text-4xl">
          Overall standings
        </h2>
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

/** "2026-10-11" → "Oct 11" */
function formatShortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The panel under a team's row: its completed games that don't count, and why. */
function UncountedGames({ team, games }: { team: string; games: readonly UncountedGame[] }) {
  if (games.length === 0) {
    return <p className="text-xs text-[#615c52]">Every {team} game so far has counted.</p>;
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

async function Standings() {
  // Runs at build time; the daily deploy workflow rebuilds the site with fresh data.
  const [games, teamNames, logoTeams] = await Promise.all([
    loadGames(),
    loadTeamNames(),
    loadLogoTeams(),
  ]);
  const counted = selectCountedGames(games);
  const rows = computeStandings(games);
  const uncounted = selectUncountedGames(games);

  return (
    <>
      <SectionHeading clubCount={rows.length} note={seasonNote(counted, rows)} />

      <div className="overflow-hidden border-y-2 border-[#17211d]">
        <div className="overflow-x-auto">
          {/* Fixed layout: RK and Club keep their widths and the stat columns share the rest equally. */}
          <table className="w-full min-w-[440px] table-fixed border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-[#17211d] text-[#f2ead9]">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-inherit w-14 px-3 max-sm:w-12 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]"
                >
                  RK
                </th>
                <th
                  scope="col"
                  className="sticky left-14 z-10 max-sm:left-12 bg-inherit max-sm:shadow-[inset_-1px_0_0_#c9beaa] w-28 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] sm:w-72"
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
                    details={<UncountedGames team={row.team} games={uncounted.get(row.team) ?? []} />}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const ANSWER_TEXT = "text-sm leading-relaxed text-[#615c52]";

function FaqAnswerBlock({ block }: { block: FaqBlock }) {
  if (block.kind === "paragraph") return <p className={ANSWER_TEXT}>{block.text}</p>;
  const List = block.kind === "ordered" ? "ol" : "ul";
  return (
    <List className={`${ANSWER_TEXT} list-inside space-y-1 ${block.kind === "ordered" ? "list-decimal" : "list-disc"}`}>
      {block.items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </List>
  );
}

/** Questions and answers from FAQ.md, read at build time. */
async function Faq() {
  const entries = await loadFaq();
  if (entries.length === 0) return null;

  return (
    <section className="border-t border-[#17211d] py-8 sm:py-10" aria-labelledby="faq-title">
      <h2 id="faq-title" className="mb-6 font-serif text-3xl tracking-tight sm:text-4xl">
        FAQ
      </h2>
      <div className="space-y-8">
        {entries.map((entry) => (
          <div key={entry.question}>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9e3028]">
              {entry.question}
            </h3>
            <div className="space-y-2">
              {entry.blocks.map((block, index) => (
                <FaqAnswerBlock key={index} block={block} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f2ead9] px-4 py-10 text-[#17211d] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-[#17211d] pb-8 sm:pb-10">
          <div className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9e3028]">
            <span className="h-px w-8 bg-[#9e3028]" aria-hidden="true" />
            League-wide standings
          </div>
          {/* Sized so "Presidents' Trophy" (about 7.3em wide in Georgia) fits the content width on one line. */}
          <h1 className="font-serif text-[min(7.75rem,calc((100vw-4rem)/7.8))] font-medium leading-[0.82] tracking-[-0.065em] text-[#17211d]">
            The Real
            <span className="block whitespace-nowrap italic text-[#9e3028]">Presidents’ Trophy</span>
          </h1>
        </header>

        <Intro />

        <section className="pt-8 sm:pt-10" aria-labelledby="standings-title">
          <Standings />

          <footer className="flex flex-col gap-2 py-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777064] sm:flex-row sm:justify-between">
            <p>GC Games counted · GP Games played · W Wins · L Losses · OL Overtime losses · DIFF Goal differential</p>
            <p>PTS = 2 × W + OL</p>
          </footer>
        </section>

        <Faq />

        <footer>
          <p className="border-t border-[#c9beaa] pt-5 text-xs leading-relaxed text-[#777064]">
            NHL, team names, and team logos are trademarks of the National Hockey League and its
            teams. This site is an independent fan project and is not affiliated with or endorsed by
            the NHL. Visits are counted with GoatCounter, which doesn’t use cookies or collect
            personal data.
          </p>
        </footer>
      </div>
    </main>
  );
}
