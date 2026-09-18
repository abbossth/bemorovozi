import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin's dependency chain (jwks-rsa -> jose) ships an ESM-only
  // build that Turbopack's production bundler fails to `require()` correctly
  // (ERR_REQUIRE_ESM) once deployed. Keeping it external lets Node's own
  // module resolution handle the CJS/ESM boundary instead.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
