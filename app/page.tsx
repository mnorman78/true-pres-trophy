import { Suspense } from "react";
import { connection } from "next/server";
import { loadGames } from "@/lib/games-loader";
import { computeStandings, selectCountedGames } from "@/lib/standings";
import { loadTeamNames } from "@/lib/teams";
import type { Game, StandingsRow } from "@/types/nhl";

const STAT_HEADINGS = ["PTS", "GP", "W", "L", "OL", "DIFF"] as const;

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
  clubCount?: number;
  note?: { season: string; status: string } | null;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9e3028]">
          {clubCount === undefined ? "Loading clubs" : `All ${clubCount} clubs`}
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

async function Standings() {
  // Read data/games/ on every request so new daily files show up without a rebuild.
  await connection();
  const [games, teamNames] = await Promise.all([loadGames(), loadTeamNames()]);
  const counted = selectCountedGames(games);
  const rows = computeStandings(games);

  return (
    <>
      <SectionHeading clubCount={rows.length} note={seasonNote(counted, rows)} />

      <div className="relative left-1/2 w-[max(80vw,100%)] -translate-x-1/2 overflow-hidden border-y-2 border-[#17211d]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-[#17211d] text-[#f2ead9]">
                <th
                  scope="col"
                  className="w-14 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]"
                >
                  RK
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em]"
                >
                  Club
                </th>
                {STAT_HEADINGS.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="w-16 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em]"
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
                  <tr
                    key={row.team}
                    className="border-b border-[#c9beaa] transition-colors last:border-0 hover:bg-[#e8ddc8]"
                  >
                    <td className="px-3 py-3 text-xs text-[#777064]">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <th scope="row" className="px-3 py-3 text-left font-semibold">
                      <span className="mr-4 inline-block w-8 text-[10px] font-bold tracking-[0.1em] text-[#9e3028]">
                        {row.team}
                      </span>
                      {teamNames.get(row.team) ?? row.team}
                    </th>
                    <td className="px-3 py-3 text-right font-bold text-[#17211d]">{row.pts}</td>
                    <td className="px-3 py-3 text-right text-[#615c52]">{row.gp}</td>
                    <td className="px-3 py-3 text-right text-[#615c52]">{row.w}</td>
                    <td className="px-3 py-3 text-right text-[#615c52]">{row.l}</td>
                    <td className="px-3 py-3 text-right text-[#615c52]">{row.ol}</td>
                    <td className="px-3 py-3 text-right text-[#615c52]">{formatDiff(row.diff)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StandingsFallback() {
  return (
    <>
      <SectionHeading />
      <div className="border-y-2 border-[#17211d] px-3 py-8 text-center text-sm text-[#6e685c]">
        Loading standings…
      </div>
    </>
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
          <h1 className="max-w-4xl font-serif text-[clamp(3.25rem,9vw,7.75rem)] font-medium leading-[0.82] tracking-[-0.065em] text-[#17211d]">
            The Real
            <span className="block italic text-[#9e3028]">Presidents’ Trophy</span>
          </h1>
        </header>

        <section className="grid gap-8 border-b border-[#b9ad97] py-8 sm:grid-cols-[1fr_2fr] sm:gap-12 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6e685c]">
            The full picture
          </p>
          <p className="max-w-2xl text-lg leading-relaxed text-[#35403b] sm:text-xl">
            One table, every team. A league-wide view of the race that strips away divisions and
            conferences to show who truly sits at the top of hockey.
          </p>
        </section>

        <section className="pt-8 sm:pt-10" aria-labelledby="standings-title">
          <Suspense fallback={<StandingsFallback />}>
            <Standings />
          </Suspense>

          <footer className="flex flex-col gap-2 py-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777064] sm:flex-row sm:justify-between">
            <p>GP Games played · W Wins · L Losses · OL Overtime losses · DIFF Goal differential</p>
            <p>PTS = 2 × W + OL</p>
          </footer>
        </section>
      </div>
    </main>
  );
}
