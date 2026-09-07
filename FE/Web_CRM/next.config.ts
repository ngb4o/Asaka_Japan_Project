import type { NextConfig } from "next";
import os from "node:os";

function lanHostnames() {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const family = String(addr.family);
      if ((family === "IPv4" || family === "4") && !addr.internal) {
        hosts.add(addr.address);
      }
    }
  }
  return [...hosts];
}

const lanHosts = lanHostnames();

const nextConfig: NextConfig = {
  // Cho phép mở CRM qua IP LAN hiện tại (đổi Wi‑Fi thì restart `next dev`)
  allowedDevOrigins: lanHosts,
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
      ...lanHosts
        .filter((h) => h !== "localhost")
        .map((hostname) => ({
          protocol: "http" as const,
          hostname,
          port: "8017",
          pathname: "/uploads/**",
        })),
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
