import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static/ffprobe-static resolve their binary paths dynamically at
  // runtime, so Next's build-time file tracer can miss them and the upload
  // route would crash on Vercel with "spawn ENOENT" in production.
  outputFileTracingIncludes: {
    "/api/admin/fragments": ["./node_modules/ffmpeg-static/**/*", "./node_modules/ffprobe-static/**/*"],
  },
};

export default nextConfig;
