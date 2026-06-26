import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "http://18.224.104.1:3001/:path*",
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
