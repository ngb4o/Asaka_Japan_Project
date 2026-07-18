import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SocialFab } from "@/components/layout/SocialFab";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Công ty TNHH ASAKA - JAPAN",
  description:
    "Công ty TNHH ASAKA - JAPAN — giải pháp BVTV chất lượng cao, phân phối toàn quốc, đồng hành cùng nông dân và đại lý.",
  metadataBase: new URL("https://asaka-japan.com"),
  openGraph: {
    title: "Công ty TNHH ASAKA - JAPAN",
    description:
      "Công ty TNHH ASAKA - JAPAN — giải pháp BVTV chất lượng cao, phân phối toàn quốc, đồng hành cùng nông dân và đại lý.",
    url: "https://asaka-japan.com",
    siteName: "Công ty TNHH ASAKA - JAPAN",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/images/brand/logo.png",
        width: 512,
        height: 512,
        alt: "Logo ASAKA JAPAN",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={barlow.variable}>
      <body className={`${barlow.className} antialiased`}>
        <Header />
        {children}
        <Footer />
        <SocialFab />
      </body>
    </html>
  );
}
