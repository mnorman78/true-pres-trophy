import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteShell } from "@/app/site-shell";
import { loadLogoTeams } from "@/lib/logos";
import { listArchivedSeasons, loadArchivedSeason, seasonTitle } from "@/lib/seasons";
import { computeStandings } from "@/lib/standings";
import { loadTeamNames } from "@/lib/teams";

export const metadata: Metadata = {
  title: "Winners · The Real Presidents’ Trophy",
  description:
    "Every Real Presidents’ Trophy winner: the club on top of each finished season's balanced-schedule standings.",
};

/** The first-place club of every archived season under our rules, newest first. */
export default async function WinnersPage() {
  const [slugs, teamNames, logoTeams] = await Promise.all([
    listArchivedSeasons(),
    loadTeamNames(),
    loadLogoTeams(),
  ]);
  const winners = await Promise.all(
    slugs.map(async (slug) => {
      const { games } = await loadArchivedSeason(slug);
      return { slug, row: computeStandings(games)[0] };
    }),
  );

  return (
    <SiteShell linkTitleHome>
      <p className="pt-6 text-xs font-bold uppercase tracking-[0.18em]">
        <Link href="/" className="text-[#9e3028] underline-offset-4 hover:underline">
          ← Current standings
        </Link>
      </p>
      <section className="pt-3 pb-8" aria-labelledby="winners-title">
        <h2 id="winners-title" className="font-serif text-3xl tracking-tight sm:text-4xl">
          Winners
        </h2>
        <p className="mt-1 mb-5 text-[11px] text-[#777064]">
          First place in each finished season, counting only the first home and away game between
          each pair of clubs.
        </p>

        <div className="border-y-2 border-[#17211d]">
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-[#17211d] text-left text-[10px] font-bold uppercase tracking-[0.15em] text-[#f2ead9]">
                <th scope="col" className="w-24 px-3 py-3 sm:w-32">Season</th>
                <th scope="col" className="px-3 py-3">Club</th>
                <th scope="col" className="w-16 px-3 py-3 text-right sm:w-24">PTS</th>
              </tr>
            </thead>
            <tbody>
              {winners.map(({ slug, row }) => (
                <tr
                  key={slug}
                  className="border-b border-[#c9beaa] bg-[#f2ead9] last:border-0 hover:bg-[#e8ddc8]"
                >
                  <th scope="row" className="px-3 py-3 text-left font-semibold">
                    <Link href={`/seasons/${slug}`} className="underline underline-offset-4 hover:text-[#9e3028]">
                      {seasonTitle(slug)}
                    </Link>
                  </th>
                  <td className="px-3 py-3 font-semibold">
                    <span className="flex items-center">
                      {/* NHL logos share a 960×640 canvas, so a 3:2 box sizes them all alike. */}
                      <span className="mr-2 inline-block h-5 w-[30px] shrink-0">
                        {logoTeams.has(row.team) && (
                          <Image src={`/logos/${row.team}.svg`} alt="" width={30} height={20} unoptimized />
                        )}
                      </span>
                      <span className="mr-4 inline-block w-8 shrink-0 text-[10px] font-bold tracking-[0.1em] text-[#9e3028] max-sm:mr-0">
                        {row.team}
                      </span>
                      <span className="max-sm:sr-only">{teamNames.get(row.team) ?? row.team}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#17211d]">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777064]">
          PTS = 2 × W + OL, from each club’s 62 counted games
        </p>
      </section>
    </SiteShell>
  );
}
