import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8017",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
