# Product Requirements Document: NHL Standings Dashboard

## 1. Executive Summary
A lightweight, fast dashboard that reads daily JSON game files from a local directory. This app will show what the standings would look like when each team only plays each other twice - so for teams that play each other more than twice, the app should only consider the first home and away games between two teams.

The app calculates team points according to official NHL rules, and displays the complete current standings in a single, responsive table.

## 2. Core User Stories & Capabilities
- **View Standings:** As a user, I want to see a single table showing every team's record (RK, Club, PTS, GP, W, L, OL, DIFF). GF and GA are still computed (they feed the tie-breakers) but are not shown in the table.
- **Automatic Aggregation:** As a user, I want adding a new daily JSON file to `data/games/` to automatically update the standings without extra setup.
- **Sorting & Tie-Breaking:** As a user, I expect teams to be sorted by most points. Tiebreakers should be based on head-to-head points first, goal difference second, goals forward third.

## 3. Data Schema & Contracts

### Input JSON Schema (`data/games/YYYY-MM-DD.json`)
Claude Code needs explicit example payloads to generate type-safe parsers:

```json
{
  "games": [
    {
      "id": "2025020934",
      "season": "20252026",
      "gameDate": "2026-03-02",
      "startTime": "19:00:00",
      "homeTeam": "TOR",
      "awayTeam": "BOS",
      "homeScore": 4,
      "awayScore": 2,
      "gameState": "FINAL",
      "gameType": "regular",
      "venue": "Scotiabank Arena"
    },
    {
      "id": "2025020958",
      "season": "20252026",
      "gameDate": "2026-03-05",
      "startTime": "19:30:00",
      "homeTeam": "MTL",
      "awayTeam": "TOR",
      "homeScore": 1,
      "awayScore": 3,
      "gameState": "FINAL",
      "gameType": "regular",
      "venue": "Bell Centre"
    }
  ]
}