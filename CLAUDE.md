# CLAUDE.md - NHL Standings App

## Project Overview
A focused web application that reads a folder of JSON files (one file per day containing raw NHL game data), aggregates the scores, and displays up-to-date standings in a single responsive table.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data Source:** File-system directory (`data/games/*.json`)

## Commands
- **Development:** `npm run dev`
- **Build:** `npm run build`
- **Linting:** `npm run lint`
- Requires Node 20.9+ (`.nvmrc` pins 24; run `nvm use` first — the system default Node 14 crashes Turbopack). If you hit a Turbopack error after switching Node versions, delete `.next/`.

## Architecture & Directory Structure
- `data/games/`: Folder storing individual daily JSON files (e.g., `YYYY-MM-DD.json`).
- `app/page.tsx`: Single-page UI rendering the aggregated standings table and optional stats summary.
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
3. **Architecture Principles:**
   - Keep calculations inside `lib/standings.ts` fully pure and decoupled from file reading or React components.
   - Use Next.js Server Components for page rendering so file system access happens cleanly on the server side without needing explicit API endpoints.