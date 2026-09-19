import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin's dependency chain (jwks-rsa -> jose) ships an ESM-only
  // build that Turbopack's production bundler fails to `require()` correctly
  // (ERR_REQUIRE_ESM) once deployed. Keeping it external lets Node's own
  // module resolution handle the CJS/ESM boundary instead.
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      {
        // The service worker must never be served from a stale HTTP cache, or a fix to it
        // would not reach browsers that already installed the old one.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
