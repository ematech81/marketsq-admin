import type { NextConfig } from "next";

// The dashboard is a signed-in admin app that renders in the browser, so it does not use cacheComponents.
const nextConfig: NextConfig = {
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
