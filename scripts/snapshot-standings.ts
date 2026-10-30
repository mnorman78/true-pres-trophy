/**
 * Saves a copy of the built home page (`out/index.html`) as one self-contained HTML file, for the
 * weekly snapshots kept in a separate private repository (see `.github/workflows/deploy.yml`).
 *
 * Usage: `node scripts/snapshot-standings.ts <dir>`, after `npm run build`. Writes
 * `<dir>/YYYY-YY/YYYY-MM-DD.html` (season, then today's date in Eastern time). The stylesheet,
 * its fonts and the team logos are inlined so the file still looks right years later; scripts
 * (Next.js and analytics) are dropped, so rows don't expand. Never overwrites an existing file,
 * and writes nothing once the season is complete (the archive page has the final table).
 */
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadSeasonInfo } from "../lib/games-loader.ts";
import { seasonSlug } from "../lib/seasons.ts";

const OUT_DIR = path.join(process.cwd(), "out");

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/snapshot-standings.ts <dir>");
  process.exit(1);
}

const info = await loadSeasonInfo();
if (!info) {
  console.error("No data/season.json; run npm run fetch-games first.");
  process.exit(1);
}
if (info.complete) {
  console.log(`The ${seasonSlug(info.season)} regular season is complete; no snapshot taken.`);
  process.exit(0);
}

const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
const file = path.join(target, seasonSlug(info.season), `${date}.html`);
if (await stat(file).catch(() => null)) {
  console.log(`${file} already exists; leaving it alone.`);
  process.exit(0);
}

const MIME: Record<string, string> = { ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };

/** A file under `out/` as a data: URI. `src` is a site path ("/logos/BOS.svg"). */
async function dataUri(src: string): Promise<string> {
  const bytes = await readFile(path.join(OUT_DIR, src.split("?")[0]));
  return `data:${MIME[path.extname(src.split("?")[0])] ?? "application/octet-stream"};base64,${bytes.toString("base64")}`;
}

/** Runs an async replacer over every match of a global regex. */
async function replaceAsync(text: string, regex: RegExp, replacer: (...match: string[]) => Promise<string>) {
  const replacements = await Promise.all([...text.matchAll(regex)].map((match) => replacer(...match)));
  let i = 0;
  return text.replace(regex, () => replacements[i++]);
}

let html = await readFile(path.join(OUT_DIR, "index.html"), "utf8");

html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
html = html.replace(/<link\b[^>]*rel="(?:preload|modulepreload|icon|apple-touch-icon)"[^>]*\/?>/g, "");

html = await replaceAsync(html, /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*\/?>/g, async (_, href) => {
  const css = await readFile(path.join(OUT_DIR, href), "utf8");
  // Font URLs are relative to the stylesheet.
  const inlined = await replaceAsync(css, /url\(([^)"']+)\)/g, async (match, url) =>
    url.startsWith("data:") ? match : `url(${await dataUri(path.posix.join(path.posix.dirname(href), url))})`,
  );
  return `<style>${inlined}</style>`;
});

html = await replaceAsync(html, /src="(\/logos\/[^"]+)"/g, async (_, src) => `src="${await dataUri(src)}"`);
// Links to other pages (Past seasons, All winners) go to the live site.
html = html.replace(/href="\//g, 'href="https://presidents-trophy.com/');

await mkdir(path.dirname(file), { recursive: true });
await writeFile(file, html);
console.log(`Wrote ${file}.`);
