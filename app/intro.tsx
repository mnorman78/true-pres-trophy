"use client";

import { INTRO_COLLAPSED, INTRO_STORAGE_KEY } from "@/lib/intro-state";

const TOGGLE_CLASSES =
  "cursor-pointer text-xs font-bold uppercase tracking-[0.18em] text-[#9e3028] underline-offset-4 hover:underline";

function setCollapsed(collapsed: boolean) {
  const root = document.documentElement;
  if (collapsed) root.dataset.intro = INTRO_COLLAPSED;
  else delete root.dataset.intro;
  try {
    if (collapsed) localStorage.setItem(INTRO_STORAGE_KEY, INTRO_COLLAPSED);
    else localStorage.removeItem(INTRO_STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode, disabled site data); the toggle still works for this visit.
  }
}

/**
 * The intro paragraph with a "Collapse" control at its end. Which half shows is decided by CSS
 * from `<html data-intro>`, so the server-rendered HTML is correct before React hydrates.
 */
export function Intro() {
  return (
    <section className="border-b border-[#b9ad97] py-8 sm:py-10 in-data-[intro=collapsed]:py-4 sm:in-data-[intro=collapsed]:py-5">
      <p
        id="intro-text"
        className="text-lg leading-relaxed text-[#35403b] sm:text-xl in-data-[intro=collapsed]:hidden"
      >
        The NHL Presidents’ Trophy has never been respected, partially because the standings
        can’t account for teams’ strength of schedule differences. These standings fix that by
        limiting the Presidents’ Trophy standings to a completely balanced schedule. The only
        games counted are the first home and away games against each team, for a total of 62
        games (31 teams faced × 2 games each).{" "}
        <button
          type="button"
          id="intro-collapse"
          aria-controls="intro-text"
          aria-expanded="true"
          className={`${TOGGLE_CLASSES} ml-1 align-middle`}
          onClick={() => {
            setCollapsed(true);
            document.getElementById("intro-expand")?.focus();
          }}
        >
          Collapse
        </button>
      </p>
      <button
        type="button"
        id="intro-expand"
        aria-controls="intro-text"
        aria-expanded="false"
        className={`${TOGGLE_CLASSES} hidden in-data-[intro=collapsed]:inline`}
        onClick={() => {
          setCollapsed(false);
          document.getElementById("intro-collapse")?.focus();
        }}
      >
        Show intro
      </button>
    </section>
  );
}
