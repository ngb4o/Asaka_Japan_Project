import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kho hàng",
    short_name: "Kho",
    description: "Quản lý sản phẩm trong kho",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#017d03",
    lang: "vi",
    id: "/",
    scope: "/",
    orientation: "portrait-primary",
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
