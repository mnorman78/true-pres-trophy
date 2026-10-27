# FAQ

<!--
Shown in the FAQ section below the standings table. Each "## " line starts a question; the lines
under it are the answer. Answers can use paragraphs (separate them with a blank line), numbered
lists ("1. ") and bullet lists ("- "). Other Markdown (bold, links, images) shows as plain text.
-->

## Why does this site exist?

This site exists to answer the questions "What if there were a better way to award the Presidents' Trophy?" and "What if the NHL used a balanced schedule for the Presidents' Trophy?" The standings table above shows what would happen if we only counted one home game and one away game between opponents so the Presidents' Trophy could be determined in a completely balanced and fair manner.

## What are the tiebreakers?

Clubs tied on points are ranked by:

<!-- Keep in step with the sort order in computeStandings (lib/standings.ts). -->
1. Head-to-head points among the tied clubs
2. Total wins
3. Goal differential
4. Regulation wins
5. Regulation and overtime wins
6. Goals for

## What is the difference between GC and GP?

GC is the number of games counted under our rules, and GP is the total number of games a team has played in the NHL season. At the end of the season, each team's GC will be 62 and each team's GP will be 84.

## How do you calculate which games are counted for the GC column?

A game is counted for the standings if it's the first time a team has hosted another team this season. For example, the Carolina Hurricanes hosted the Washington Capitals on Oct 2, 2026 and Oct 13, 2026. Only the first of those two games counts towards the standings because Carolina was the home team in both. The next game that will count between the two teams will be Jan 14, 2027, since the Capitals will be hosting Carolina for the first time. That will also be the last game that counts between the teams, because only two games between any two teams count.

## How are neutral-site games handled?

Neutral-site games are counted in the calculations since they still have a defined home team. These games are often interconference games, so there are no other games to count between those teams. For example, in the 2026–27 season, Ottawa and Chicago are playing in Germany. Since those are the only two times those teams will play all season, those two games will be counted.