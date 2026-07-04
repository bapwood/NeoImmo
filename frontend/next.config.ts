import type { NextConfig } from "next";

// Where the NestJS backend actually lives. Defaults to localhost for local
// dev (and for a single-VPS deployment where the frontend also runs on that
// same host), but MUST be overridden to the backend's real public address
// when the frontend is hosted separately (e.g. Vercel) — Vercel's runtime has
// no network path to "localhost" on your own server.
const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendOrigin}/:path*`,
        },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/signin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
