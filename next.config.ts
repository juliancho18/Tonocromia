import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // fluent-ffmpeg/ffmpeg-static/ffprobe-static resolve their binary paths
  // dynamically (via __dirname) at runtime. Next.js bundles Route Handler
  // code by default, which breaks that resolution, so these must stay as
  // native `require`s instead of being bundled.
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "ffprobe-static"],
  // ffmpeg-static/ffprobe-static resolve their binary paths dynamically at
  // runtime, so Next's build-time file tracer can miss them and the upload
  // route would crash on Vercel with "spawn ENOENT" in production.
  outputFileTracingIncludes: {
    "/api/admin/fragments": ["./node_modules/ffmpeg-static/**/*", "./node_modules/ffprobe-static/**/*"],
  },
};

export default nextConfig;
