import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép mở CRM qua IP LAN trên thiết bị thật (Next.js 15+)
  allowedDevOrigins: ["192.168.1.167"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8017",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "192.168.1.167",
        port: "8017",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "asaka-api.onrender.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
