import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { RESTORE_INTRO_SCRIPT } from "@/lib/intro-state";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes the share image (app/opengraph-image.png) an absolute URL, which link previews need.
  metadataBase: new URL("https://presidents-trophy.com"),
  title: "The Real Presidents’ Trophy",
  description:
    "League-wide NHL standings counting only the first home and away game between each pair of clubs.",
  openGraph: { type: "website", siteName: "The Real Presidents’ Trophy" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The restore script may set data-intro on <html> before React hydrates.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: RESTORE_INTRO_SCRIPT }} />
        {/* GoatCounter visit counts (no cookies). count.js skips localhost, so dev visits aren't counted. */}
        <script
          data-goatcounter="https://mnorman78.goatcounter.com/count"
          async
          src="https://gc.zgo.at/count.js"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
