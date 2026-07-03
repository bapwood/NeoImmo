import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "http://localhost:3000/:path*",
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
