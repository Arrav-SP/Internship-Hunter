import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is off on purpose: every page reads the login cookie, so there's no static shell
  // to gain, and with it on the prerendered layout streams first and commits a 200 before notFound()
  // can return a real 404.
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
