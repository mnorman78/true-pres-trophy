import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a fully static site in out/ for GitHub Pages.
  output: "export",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
