/**
 * Renders the YouTube channel images into `brand/youtube/`, in the same style as the share image
 * (`scripts/render-share-image.ts`): the 800×800 profile picture (YouTube crops it to a circle),
 * the 2560×1440 banner (everything that matters sits in the 1546×423 middle that every device
 * shows) and the 150×150 video watermark. Run with `node scripts/render-youtube-assets.ts` and
 * commit the PNGs. Needs macOS for Georgia.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createElement as h, type CSSProperties, type ReactNode } from "react";
import { ImageResponse } from "next/og.js";

const ROOT = process.cwd();
const GEORGIA = "/System/Library/Fonts/Supplemental";
const OUT = path.join(ROOT, "brand", "youtube");

const [georgia, georgiaItalic, geist, icon] = await Promise.all([
  readFile(path.join(GEORGIA, "Georgia.ttf")),
  readFile(path.join(GEORGIA, "Georgia Italic.ttf")),
  readFile(path.join(ROOT, "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf")),
  readFile(path.join(ROOT, "app", "icon.svg"), "utf8"),
]);
const iconSrc = `data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}`;

const fonts = [
  { name: "Georgia", data: georgia, style: "normal" as const, weight: 400 as const },
  { name: "Georgia", data: georgiaItalic, style: "italic" as const, weight: 400 as const },
  { name: "Geist", data: geist, style: "normal" as const, weight: 400 as const },
];

function div(style: CSSProperties, ...children: ReactNode[]) {
  return h("div", { style: { display: "flex", ...style } }, ...children);
}

function img(src: string, width: number, height: number, style: CSSProperties = {}) {
  return h("img", { src, width, height, style });
}

/** The goal's net, repeated across the banner as a faint background. */
function netSvg(width: number, height: number, cell: number) {
  const lines: string[] = [];
  for (let x = cell / 2; x < width; x += cell) lines.push(`M${x} 0V${height}`);
  for (let y = cell / 2; y < height; y += cell) lines.push(`M0 ${y}H${width}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="${lines.join("")}" stroke="#b9ad97" stroke-width="3" opacity="0.35"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function render(name: string, width: number, height: number, element: ReactNode) {
  const response = new ImageResponse(element as React.ReactElement, { width, height, fonts });
  const file = path.join(OUT, name);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  console.log(`Wrote ${path.relative(ROOT, file)}.`);
}

await mkdir(OUT, { recursive: true });

// The icon's rounded corners match the background, so they vanish; the goal stays well inside
// the circle crop.
await render(
  "profile.png",
  800,
  800,
  div(
    { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#f2ead9" },
    img(iconSrc, 680, 680),
  ),
);

await render("watermark.png", 150, 150, div({ width: "100%", height: "100%" }, img(iconSrc, 150, 150)));

const BANNER_W = 2560;
const BANNER_H = 1440;
await render(
  "banner.png",
  BANNER_W,
  BANNER_H,
  div(
    {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      background: "#f2ead9",
      color: "#17211d",
    },
    img(netSvg(BANNER_W, BANNER_H, 120), BANNER_W, BANNER_H, { position: "absolute", left: 0, top: 0 }),
    // The safe area every device shows, on a solid panel so the text sits clear of the net.
    div(
      {
        width: 1546,
        height: 423,
        alignItems: "center",
        padding: "0 56px",
        background: "#f2ead9",
        borderTop: "4px solid #9e3028",
        borderBottom: "4px solid #9e3028",
      },
      img(iconSrc, 260, 260),
      div(
        { flexDirection: "column", marginLeft: 64 },
        div(
          { fontFamily: "Georgia", fontSize: 92, lineHeight: 1, letterSpacing: -3 },
          "The Real ",
          div({ fontStyle: "italic", color: "#9e3028" }, "Presidents’ Trophy"),
        ),
        div(
          { marginTop: 28, fontFamily: "Geist", fontSize: 30, letterSpacing: 3, color: "#615c52" },
          "presidents-trophy.com",
        ),
      ),
    ),
  ),
);
