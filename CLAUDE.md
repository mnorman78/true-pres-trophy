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
- `scripts/fetch-games.ts`: Fetches the current regular season from `https://api-web.nhle.com/v1/schedule/{date}` (one call per week), maps it to the `Game` type, runs data-quality checks, and only if they all pass replaces every `.json` file in `data/games/`. Exits non-zero and leaves the files alone on any problem.
- `app/page.tsx`: Single-page UI rendering the aggregated standings table and optional stats summary. Rendered once at build time.
- `.github/workflows/deploy.yml`: On every push to `main`, daily at 08:00 UTC, and on manual run: `npm run fetch-games`, `npm run build`, deploy `out/` to GitHub Pages. A failed data check stops the deploy, so the live site keeps the last good table.
- `lib/games-loader.ts`: Node.js file-system loader (`fs/promises`). Reads all `.json` files in `data/games/`, parses them safely, and aggregates them into a single list of games.
- `lib/standings.ts`: Pure functional calculation engine. Takes raw game arrays and computes aggregated records (GP, W, L, OL, PTS, GF, GA, DIFF).
- `lib/teams.ts`: Reads `TEAM-LIST.md` into an abbreviation → team name map.
- `types/nhl.ts`: TypeScript definitions for daily game JSON schemas and processed standings rows.

## Design
- Source: Figma Make file `CWBmDVDrzGBaf4UXXGPl5A` ("Single-Page-App-Design").
- Table columns, in order: RK, Club, PTS, GP, W, L, OL, DIFF. Use "OL" (not "OT") for overtime losses everywhere.
- GF and GA are computed in `lib/standings.ts` but not displayed.
- Full team names for the Club column come from `TEAM-LIST.md` (abbreviation → name). An abbreviation missing from the list falls back to showing the abbreviation itself.
- The "All N clubs" label counts teams that appear in the game data, not entries in `TEAM-LIST.md`.

## Core Logic & Domain Rules
1. **File Ingestion Rules:**
   - Read all `.json` files dynamically from `data/games/`.
   - Safely ignore non-JSON files or malformed files with a console warning rather than crashing the loader.
2. **Counting Rules:**
   - Only completed (`gameState` FINAL/OFF) regular-season games count.
   - For each pair of teams, only the first game at each team's home rink counts (by date, then start time).
   - A loss is an OL when the game's optional `periodType` is `"OT"` or `"SO"`; without that field it is a regulation loss.
   - The fetch script copies `periodType` from the API's `periodDescriptor.periodType` (REG/OT/SO). A shootout winner's score already includes the +1 shootout goal.
3. **Data-Quality Checks (fetch script):** a final game must not be tied and must have a REG/OT/SO period type; game ids must be unique; both teams must be in `TEAM-LIST.md` and different; no team may have more than 84 regular-season games (the schedule length from 2026–27 on).
4. **Architecture Principles:**
   - Keep calculations inside `lib/standings.ts` fully pure and decoupled from file reading or React components.
   - Use Next.js Server Components for page rendering so file system access happens at build time without needing explicit API endpoints. The site is static: no per-request rendering, `connection()`, or server-only runtime features.