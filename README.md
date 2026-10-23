# The Real Presidents’ Trophy

League-wide NHL standings built on a perfectly balanced schedule.

**Live site:** [presidents-trophy.com](https://presidents-trophy.com)

The NHL Presidents’ Trophy has never been respected, partially because the standings can’t account for teams’ strength of schedule differences. These standings fix that by limiting the Presidents’ Trophy standings to a completely balanced schedule. The only games counted are the first home and away games against each team, for a total of 62 games (31 teams faced × 2 games each).

## How the standings are calculated

### Which games count

A game counts only if all of these are true:

1. It's a **regular-season** game.
2. It's **final**.
3. It's the **first game this season between those two clubs with the same home team**, by date and then start time.

Each pair of clubs therefore contributes at most two games: one with each club as the home team. No club can have more than 31 opponents × 2 = **62 games played**, and by the end of the season every club has faced every opponent once at home and once away. Every later meeting between the same two clubs is ignored.

"Home team" means the NHL's designated home team, even when the game is played somewhere else, such as an outdoor Stadium Series game or a Global Series game overseas. That's how the NHL itself counts those games, and it keeps every club on exactly the same 62-game schedule.

### Points

| Result | Points |
|---|---|
| Win (W), in regulation, overtime, or a shootout | 2 |
| Overtime or shootout loss (OL) | 1 |
| Regulation loss (L) | 0 |

**PTS = 2 × W + OL.** A loss counts as an OL when the game ended in overtime or a shootout, using the NHL's own record of how the game ended.

**DIFF** is goal differential: goals for minus goals against in counted games. As in the NHL's own standings, a shootout winner is credited with one extra goal.

### Tiebreakers

Clubs are ranked by points. Clubs tied on points are ranked by, in order:

1. Head-to-head points among the tied clubs (in counted games between them)
2. Goal differential
3. Goals for
4. Regulation wins
5. Regulation and overtime wins
6. Total wins

If clubs are still level after all six, they're listed alphabetically by abbreviation so the order is stable. That isn't treated as a tiebreaker.

## Where the data comes from

Game results come from the NHL's public web API (`api-web.nhle.com`, which is undocumented), one weekly schedule request at a time. Team logos come from the same API.

A GitHub Action rebuilds the site every day at 08:00 UTC, on every push to `main`, and on demand. Each run fetches the whole season again, so late score corrections and rescheduled games are picked up automatically. Before anything is published, the data is checked:

- No final game has a tied score, and every final game says whether it ended in regulation, overtime, or a shootout.
- No game appears twice.
- Both clubs in every game are known NHL clubs, and no club plays itself.
- No club has more than 84 regular-season games.

If any check fails, nothing is deployed and the site keeps the last good table.

## Development

Requires Node 22.18 or later (`.nvmrc` pins 24).

```bash
nvm use
npm install
npm run fetch-games   # download this season's games and team logos
npm run dev           # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run fetch-games` | Fetches the current season into `data/games/` and logos into `public/logos/` (neither is committed). Add `-- YYYY-MM-DD` to fetch the season containing that date. |
| `npm run dev` | Starts the local dev server. |
| `npm run build` | Builds the static site into `out/`. |
| `npm run lint` | Runs ESLint. |

Built with Next.js (static export), TypeScript, and Tailwind CSS, and hosted on GitHub Pages. The counting and ranking rules live in [`lib/standings.ts`](lib/standings.ts); the data fetching and checks are in [`scripts/fetch-games.ts`](scripts/fetch-games.ts).

## Disclaimer

NHL, team names, and team logos are trademarks of the National Hockey League and its teams. This site is an independent fan project and is not affiliated with or endorsed by the NHL.
