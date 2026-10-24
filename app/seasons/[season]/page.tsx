import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/app/site-shell";
import { finalStandingsLine, StandingsSection } from "@/app/standings-section";
import { loadLogoTeams } from "@/lib/logos";
import { listArchivedSeasons, loadArchivedSeason, seasonTitle } from "@/lib/seasons";
import { loadTeamNames } from "@/lib/teams";

// One static page per file in data/seasons/; any other season is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listArchivedSeasons()).map((season) => ({ season }));
}

export async function generateMetadata({ params }: PageProps<"/seasons/[season]">): Promise<Metadata> {
  const { season } = await params;
  return {
    title: `${seasonTitle(season)} final standings · The Real Presidents’ Trophy`,
    description: `Final ${seasonTitle(season)} NHL standings counting only the first home and away game between each pair of clubs.`,
  };
}

/** The final standings of one archived season, from its committed data/seasons/ file. */
export default async function SeasonPage({ params }: PageProps<"/seasons/[season]">) {
  const { season } = await params;
  const [archived, teamNames, logoTeams] = await Promise.all([
    loadArchivedSeason(season),
    loadTeamNames(),
    loadLogoTeams(),
  ]);

  return (
    <SiteShell linkTitleHome>
      <p className="pt-6 text-xs font-bold uppercase tracking-[0.18em]">
        <Link href="/" className="text-[#9e3028] underline-offset-4 hover:underline">
          ← Current standings
        </Link>
      </p>
      <StandingsSection
        title={`${seasonTitle(season)} final standings`}
        updated={finalStandingsLine(archived.games)}
        games={archived.games}
        complete
        teamNames={teamNames}
        logoTeams={logoTeams}
      />
    </SiteShell>
  );
}
