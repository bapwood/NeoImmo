import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "http://TON_IP_AWS:TON_PORT/api/:path*",
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
