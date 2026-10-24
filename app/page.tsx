import { Intro } from "@/app/intro";
import { SiteShell } from "@/app/site-shell";
import { finalStandingsLine, StandingsSection } from "@/app/standings-section";
import Link from "next/link";
import { loadFaq, type FaqBlock } from "@/lib/faq";
import { loadGames, loadSeasonInfo } from "@/lib/games-loader";
import { loadLogoTeams } from "@/lib/logos";
import { listArchivedSeasons, seasonTitle } from "@/lib/seasons";
import { loadTeamNames } from "@/lib/teams";

/**
 * When the site was built, which is when the data was last fetched, in Eastern time (the NHL's home
 * time zone): "Oct 24, 2026, 4:02 AM EDT".
 */
function formatBuildTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

async function Standings() {
  // Runs at build time; the daily deploy workflow rebuilds the site with fresh data.
  const [games, seasonInfo, teamNames, logoTeams] = await Promise.all([
    loadGames(),
    loadSeasonInfo(),
    loadTeamNames(),
    loadLogoTeams(),
  ]);
  // Once the regular season is complete the data no longer changes, so the fine print names the
  // last game instead of the build time (rebuilds continue through the offseason).
  const complete = (seasonInfo?.complete ?? false) && games.length > 0;

  return (
    <StandingsSection
      title="Overall standings"
      updated={complete ? finalStandingsLine(games) : `Last updated ${formatBuildTime(new Date())}`}
      games={games}
      complete={complete}
      teamNames={teamNames}
      logoTeams={logoTeams}
    />
  );
}

/** Links to the archived final standings of past seasons, newest first. */
async function PastSeasons() {
  const slugs = await listArchivedSeasons();
  if (slugs.length === 0) return null;

  return (
    <nav aria-labelledby="past-seasons-title" className="border-t border-[#c9beaa] py-5">
      <h2
        id="past-seasons-title"
        className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9e3028]"
      >
        Past seasons
      </h2>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link href={`/seasons/${slug}`} className="underline underline-offset-4 hover:text-[#9e3028]">
              {seasonTitle(slug)}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/winners" className="font-semibold text-[#9e3028] underline-offset-4 hover:underline">
            All winners →
          </Link>
        </li>
      </ul>
    </nav>
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
    <SiteShell>
      <Intro />
      <Standings />
      <PastSeasons />
      <Faq />
    </SiteShell>
  );
}
