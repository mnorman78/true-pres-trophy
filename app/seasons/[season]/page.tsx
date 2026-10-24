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

const NAV_LINK = "group flex flex-col gap-0.5 text-[#17211d] hover:text-[#9e3028]";
const NAV_LABEL = "text-[10px] font-bold uppercase tracking-[0.15em] text-[#9e3028]";

/**
 * Links to the archived seasons either side of this one. The newest archived season's "next" is the
 * current standings on the home page; the oldest has no "previous".
 */
function SeasonNav({ older, newer }: { older?: string; newer?: string }) {
  return (
    <nav aria-label="Other seasons" className="flex justify-between gap-4 border-b border-[#c9beaa] py-5 text-sm">
      {older ? (
        <Link href={`/seasons/${older}`} className={NAV_LINK}>
          <span className={NAV_LABEL}>← Previous season</span>
          <span className="group-hover:underline underline-offset-4">{seasonTitle(older)}</span>
        </Link>
      ) : (
        <span />
      )}
      <Link href={newer ? `/seasons/${newer}` : "/"} className={`${NAV_LINK} items-end text-right`}>
        <span className={NAV_LABEL}>Next season →</span>
        <span className="group-hover:underline underline-offset-4">
          {newer ? seasonTitle(newer) : "Current standings"}
        </span>
      </Link>
    </nav>
  );
}

/** The final standings of one archived season, from its committed data/seasons/ file. */
export default async function SeasonPage({ params }: PageProps<"/seasons/[season]">) {
  const { season } = await params;
  const [archived, slugs, teamNames, logoTeams] = await Promise.all([
    loadArchivedSeason(season),
    listArchivedSeasons(),
    loadTeamNames(),
    loadLogoTeams(),
  ]);

  // Newest first, so the season after this one comes just before it.
  const index = slugs.indexOf(season);

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
        belowTable={<SeasonNav older={slugs[index + 1]} newer={slugs[index - 1]} />}
      />
    </SiteShell>
  );
}
