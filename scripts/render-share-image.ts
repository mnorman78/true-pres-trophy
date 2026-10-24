/**
 * Renders `app/opengraph-image.png`, the 1200×630 picture shown when a page is shared (Open Graph
 * and Twitter cards). Run with `node scripts/render-share-image.ts` after changing the design and
 * commit the PNG; it isn't rendered during the build.
 *
 * Uses macOS's Georgia (the site's serif) and the Geist sans that ships with next/og, so run it on
 * a Mac. The goal-and-puck drawing is `app/icon.svg`.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createElement as h, type CSSProperties, type ReactNode } from "react";
import { ImageResponse } from "next/og.js";

const ROOT = process.cwd();
const GEORGIA = "/System/Library/Fonts/Supplemental";
const OUT = path.join(ROOT, "app", "opengraph-image.png");

const [georgia, georgiaItalic, geist, icon] = await Promise.all([
  readFile(path.join(GEORGIA, "Georgia.ttf")),
  readFile(path.join(GEORGIA, "Georgia Italic.ttf")),
  readFile(path.join(ROOT, "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf")),
  readFile(path.join(ROOT, "app", "icon.svg"), "utf8"),
]);

function div(style: CSSProperties, ...children: ReactNode[]) {
  return h("div", { style: { display: "flex", ...style } }, ...children);
}

const image = div(
  {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "64px 72px",
    background: "#f2ead9",
    color: "#17211d",
  },
  div(
    { alignItems: "flex-start", justifyContent: "space-between" },
    div(
      { flexDirection: "column" },
      div(
        { alignItems: "center", fontFamily: "Geist", fontSize: 22, letterSpacing: 5, color: "#9e3028" },
        div({ width: 48, height: 2, background: "#9e3028", marginRight: 18 }),
        "LEAGUE-WIDE NHL STANDINGS",
      ),
      div(
        {
          flexDirection: "column",
          marginTop: 36,
          fontFamily: "Georgia",
          fontSize: 118,
          lineHeight: 0.9,
          letterSpacing: -5,
        },
        div({}, "The Real"),
        div({ fontStyle: "italic", color: "#9e3028" }, "Presidents’ Trophy"),
      ),
    ),
    h("img", {
      src: `data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}`,
      width: 150,
      height: 150,
    }),
  ),
  div(
    { flexDirection: "column" },
    div(
      { fontFamily: "Georgia", fontSize: 34, lineHeight: 1.35, color: "#35403b", maxWidth: 960 },
      "Standings on a balanced schedule: only the first home and away game between each pair of clubs counts.",
    ),
    div(
      {
        marginTop: 34,
        paddingTop: 22,
        borderTop: "2px solid #17211d",
        fontFamily: "Geist",
        fontSize: 24,
        letterSpacing: 2,
        color: "#615c52",
      },
      "presidents-trophy.com",
    ),
  ),
);

const response = new ImageResponse(image, {
  width: 1200,
  height: 630,
  fonts: [
    { name: "Georgia", data: georgia, style: "normal", weight: 400 },
    { name: "Georgia", data: georgiaItalic, style: "italic", weight: 400 },
    { name: "Geist", data: geist, style: "normal", weight: 400 },
  ],
});
await writeFile(OUT, Buffer.from(await response.arrayBuffer()));
console.log(`Wrote ${path.relative(ROOT, OUT)}.`);
