import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ASAKA CRM",
    short_name: "ASAKA CRM",
    description: "Hệ thống quản lý sản phẩm ASAKA JAPAN",
    start_url: "/",
    display: "fullscreen",
    background_color: "#ffffff",
    theme_color: "#166534",
    lang: "vi",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
