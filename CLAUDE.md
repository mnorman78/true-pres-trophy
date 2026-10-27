# CLAUDE.md - NHL Standings App

## Project Overview
A focused web application that reads a folder of JSON files (one file per day containing raw NHL game data), aggregates the scores, and displays up-to-date standings in a single responsive table.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data Source:** File-system directory (`data/games/*.json`), filled from the NHL's public API by `npm run fetch-games`
- **Hosting:** GitHub Pages at https://presidents-trophy.com, as a static export (`output: "export"`, built into `out/`)

## Commands
- **Development:** `npm run dev`
- **Build:** `npm run build` (writes the static site to `out/`)
- **Linting:** `npm run lint`
- **Fetch game data:** `npm run fetch-games` (optionally `-- YYYY-MM-DD` to fetch the season containing that date)
- Requires Node 22.18+, since the fetch script runs TypeScript directly (`.nvmrc` pins 24; run `nvm use` first — the system default Node 14 crashes Turbopack). If you hit a Turbopack error after switching Node versions, delete `.next/`.

## Architecture & Directory Structure
- `data/games/`: Folder storing individual daily JSON files (e.g., `YYYY-MM-DD.json`). Generated, not committed (gitignored).
- `data/seasons/`: One committed `YYYY-YY.json` per finished regular season (every game, one per line), written once by the fetch script when `data/season.json` says the season is complete and never overwritten. Each becomes a static page at `/seasons/YYYY-YY` (`app/seasons/[season]/page.tsx`, `generateStaticParams`), linked from "Past seasons" on the home page. Between each archive page's table and legend, "Previous season" / "Next season" links step through the archive; the newest season's "Next season" goes to the current standings, and the oldest has no "Previous season". On archive pages an asterisk after the abbreviation marks the NHL's own Presidents' Trophy winner (`nhlPointsLeader` in `lib/standings.ts`: every completed game, NHL points, then regulation wins, regulation + overtime wins, wins), with a footnote under the table. Verified against the NHL standings API for 2021–22 through 2025–26 (FLA, BOS, NYR, WPG, COL). Archive pages use today's logos (logos aren't committed) and recompute standings with the current rules. `lib/seasons.ts` reads and writes these files. Archived so far: 2021–22 (first 32-team season) through 2025–26; `TEAM-LIST.md` keeps `ARI` for the Coyotes seasons. `npm run dev` reads the season list once, so restart it after adding a file.
- `scripts/fetch-games.ts`: Fetches the current regular season from `https://api-web.nhle.com/v1/schedule/{date}` (one call per week), maps it to the `Game` type, runs data-quality checks, and only if they all pass replaces every `.json` file in `data/games/`. Until a game of the current season has finished (offseason, preseason, opening day before the first final), it fetches the previous regular season instead (end date from `/v1/standings-season`), so the finished season stays up and offseason builds don't fail. It also writes `data/season.json` (gitignored): season id, regular-season end date, and `complete` (whole schedule fetched and every game final). Exits non-zero and leaves the files alone on any problem. It also saves each team's current logo (from the API's `logo` URL) to `public/logos/ABBR.svg` (gitignored); a logo that fails to download is skipped with a warning and never fails the run.
- `app/page.tsx`: Home page: intro, current standings, Past seasons links, FAQ. Rendered once at build time.
- `app/winners/page.tsx`: `/winners`, a table of every archived season's first-place club under our rules (`computeStandings(...)[0]`) with its points, newest first; each season links to its archive page. Linked as "All winners" from Past seasons on the home page and from the top of each archive page.
- `app/standings-section.tsx`: Heading, standings table (with expandable rows) and legend for one season's games; shared by the home page and season archive pages.
- `app/site-shell.tsx`: Page frame shared by all pages (title header, trademark footer).
- `.github/workflows/deploy.yml`: On every push to `main`, daily at 08:00 UTC, and on manual run: `npm run fetch-games`, `npm run build`, deploy `out/` to GitHub Pages. A failed data check stops the deploy, so the live site keeps the last good table. If the fetch wrote a new `data/seasons/` file, the build job (`contents: write`) commits and pushes it to `main` as github-actions[bot]; that step is `continue-on-error`, so a failed push never blocks the deploy and the next run retries.
- `app/intro.tsx` + `lib/intro-state.ts`: Client component for the intro paragraph and its Collapse / Show intro toggle. The choice is saved in `localStorage` (`intro`) and restored before first paint by an inline script in `app/layout.tsx` that sets `<html data-intro="collapsed">`; CSS (`in-data-[intro=collapsed]:`) decides what shows, so there's no flash.
- `app/team-row.tsx`: Client component for one standings row. The Club cell is a button that opens a full-width row below it listing that team's uncounted games (from `selectUncountedGames` in `lib/standings.ts`, rendered on the server and passed in); it only holds the open/closed state, which isn't remembered. On phones the panel is pinned to the visible width while the stat columns scroll.
- `lib/games-loader.ts`: Node.js file-system loader (`fs/promises`). Reads all `.json` files in `data/games/`, parses them safely, and aggregates them into a single list of games.
- `lib/standings.ts`: Pure functional calculation engine. Takes raw game arrays and computes aggregated records (games counted `gp`, all games played `played`, W, L, OL, PTS, GF, GA, DIFF).
- `lib/teams.ts`: Reads `TEAM-LIST.md` into an abbreviation → team name map.
- `lib/faq.ts`: Reads `FAQ.md` into questions (`## ` headings) and answers (paragraphs, `1. ` numbered lists, `- ` bullet lists; other Markdown shows as plain text). Edit `FAQ.md` to change the FAQ; a missing file just leaves the section out.
- `lib/logos.ts`: Lists which teams have a logo in `public/logos/`; rows without one show just the abbreviation.
- `types/nhl.ts`: TypeScript definitions for daily game JSON schemas and processed standings rows.

## Design
- Source: Figma Make file `CWBmDVDrzGBaf4UXXGPl5A` ("Single-Page-App-Design").
- Table columns, in order: RK, Club, PTS, GC, GP, W, L, OL, DIFF. Use "OL" (not "OT") for overtime losses everywhere. GC (games counted, the `gp` field) is the games behind the standings; GP (the `played` field) is every completed regular-season game, counted or not, and reaches 84 by season's end.
- GF, GA, RW (regulation wins) and ROW (regulation + overtime wins) are computed in `lib/standings.ts` but not displayed.
- Full team names for the Club column come from `TEAM-LIST.md` (abbreviation → name). An abbreviation missing from the list falls back to showing the abbreviation itself.
- Club cell: logo (30×20 box; NHL logos share a 960×640 canvas), then the red abbreviation, then the full name. On phones (below `sm`) the full name is visually hidden (`sr-only`) and only logo + abbreviation show.
- The table matches the content width. RK and Club are sticky on sideways scroll; Club is capped (`w-28`, `sm:w-72`) and the stat columns share the rest (`table-fixed`).
- The header row sticks to the top of the window until the last team's row (`data-team-row` in `app/team-row.tsx`) reaches it, then scrolls off with that row: the header gets a bottom margin as tall as that row (and its open panel), measured with a ResizeObserver and cancelled by the body's negative top margin. Sticky can't escape the sideways-scroll box, so `app/sticky-header-table.tsx` shows a separate `aria-hidden` header table above it that follows its sideways scroll by shifting (`--scroll-x`), not scrolling: Chrome on Android doesn't update a sticky element that is itself a scroll container during page scroll. RK/Club header cells shift back with `translate-x-(--scroll-x)`; the real `<thead>` stays in the table, visually hidden, for screen readers. Both tables share `TABLE_CLASS` and `TableColumns` (`<colgroup>`) in `app/standings-section.tsx` so the columns line up.
- Site icon: a red goal with a puck. `app/icon.svg` is the browser favicon; `app/apple-icon.png` (180×180, square, rendered from the same drawing) is the iPhone home-screen icon. Change both together.
- Share image: `app/opengraph-image.png` (1200×630, alt text in `opengraph-image.alt.txt`) is the Open Graph / Twitter picture for every page; `metadataBase` in `app/layout.tsx` makes its URL absolute. It's a committed PNG, rendered by `node scripts/render-share-image.ts` (needs macOS for Georgia); re-run and commit after changing its design or `app/icon.svg`.
- Analytics: GoatCounter script in `app/layout.tsx` `<head>` (site code `mnorman78`). No cookies, so no consent banner; the footer disclaimer mentions it.
- Under the "Overall standings" heading, a fine-print line shows "Last updated" with the build time (date and time, Eastern), since each build fetches fresh data. Once `data/season.json` says the season is complete it shows "Final standings · last game <date>" instead, so playoff and offseason rebuilds don't look like updates.
- Below the table: the legend, then an FAQ section (`h2` "FAQ", one `h3` per question) read from `FAQ.md`, then the page footer with the trademark disclaimer for NHL names and logos; keep the disclaimer while logos are shown.

## Core Logic & Domain Rules
1. **File Ingestion Rules:**
   - Read all `.json` files dynamically from `data/games/`.
   - Safely ignore non-JSON files or malformed files with a console warning rather than crashing the loader.
2. **Counting Rules:**
   - Only completed (`gameState` FINAL/OFF) regular-season games count.
   - For each pair of teams, only the first game with each team as the designated home team counts (by date, then start time). Neutral-site games (outdoor games, Global Series; `neutralSite: true` in the API) count as the designated home team's home game, like the NHL does; this was a deliberate choice so every club stays on a balanced 62-game schedule.
   - Ranking: points, then among clubs tied on points: head-to-head points (counted games between the tied clubs), total wins, goal differential, regulation wins, regulation + overtime wins, goals for. This order applies to every season, archived ones included, since archive pages recompute from raw games. Abbreviation is a final sort only for a stable order and is not shown as a tiebreaker. The "What are the tiebreakers?" list in `FAQ.md` must match this order.
   - A loss is an OL when the game's optional `periodType` is `"OT"` or `"SO"`; without that field it is a regulation loss.
   - The fetch script copies `periodType` from the API's `periodDescriptor.periodType` (REG/OT/SO). A shootout winner's score already includes the +1 shootout goal.
3. **Data-Quality Checks (fetch script):** a final game must not be tied and must have a REG/OT/SO period type; game ids must be unique; both teams must be in `TEAM-LIST.md` and different; no team may have more than 84 regular-season games (the schedule length from 2026–27 on).
4. **Architecture Principles:**
   - Keep calculations inside `lib/standings.ts` fully pure and decoupled from file reading or React components.
   - Use Next.js Server Components for page rendering so file system access happens at build time without needing explicit API endpoints. The site is static: no per-request rendering, `connection()`, or server-only runtime features.