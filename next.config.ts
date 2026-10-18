import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in Phase 1 is per-user, so we render on request instead of
  // using Cache Components. Revisit when there are public, cacheable pages.
  serverExternalPackages: ["pg", "unpdf", "mammoth", "@electric-sql/pglite", "playwright-core"],
  // Migrations run when the server starts, so ship the SQL files with it.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  experimental: {
    serverActions: {
      // Resumes up to 5 MB are posted through a Server Action.
      bodySizeLimit: "6mb",
    },
  },
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
