import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ASAKA",
    short_name: "ASAKA",
    description: "Hệ thống quản lý sản phẩm ASAKA JAPAN",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "vi",
    id: "/",
    scope: "/",
    orientation: "portrait-primary",
    shortcuts: [
      {
        name: "Tạo đơn",
        short_name: "Tạo đơn",
        description: "Tạo đơn hàng mới",
        url: "/orders?new=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Đơn hàng",
        short_name: "Đơn hàng",
        description: "Danh sách đơn hàng",
        url: "/orders",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Kho",
        short_name: "Kho",
        description: "Tồn kho và nhập xuất",
        url: "/inventory",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Chuyến",
        short_name: "Chuyến",
        description: "Chuyến công tác / giao hàng",
        url: "/trips",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
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
