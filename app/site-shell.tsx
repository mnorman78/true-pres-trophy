import Link from "next/link";
import type { ReactNode } from "react";

/** The page frame shared by every page: title header, content, and the trademark footer. */
export function SiteShell({ children, linkTitleHome = false }: {
  children: ReactNode;
  /** Make the big title a link to the home page (on pages other than home). */
  linkTitleHome?: boolean;
}) {
  const title = (
    <>
      The Real
      <span className="block whitespace-nowrap italic text-[#9e3028]">Presidents’ Trophy</span>
    </>
  );
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
            {linkTitleHome ? <Link href="/">{title}</Link> : title}
          </h1>
        </header>

        {children}

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
