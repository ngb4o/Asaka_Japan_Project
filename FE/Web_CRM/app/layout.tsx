import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DisplayDensityProvider } from "@/components/providers/DisplayDensityProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IosPwaViewport } from "@/components/providers/IosPwaViewport";
import { NetworkStatusProvider } from "@/components/providers/NetworkStatusProvider";
import { PwaInstallProvider } from "@/components/providers/PwaInstallProvider";
import { SwUpdateProvider } from "@/components/providers/SwUpdateProvider";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASAKA CRM",
  description: "Hệ thống quản lý sản phẩm ASAKA JAPAN",
  applicationName: "ASAKA",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ASAKA",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a110e" },
  ],
};

const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('crm_theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((stored === 'system' || !stored) && prefersDark);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
  try {
    var density = localStorage.getItem('crm_density');
    if (density !== 'sm' && density !== 'md' && density !== 'lg') density = 'md';
    document.documentElement.setAttribute('data-density', density);
  } catch (e) {
    document.documentElement.setAttribute('data-density', 'md');
  }
  try {
    var nav = window.navigator;
    var ua = nav.userAgent || '';
    var ios = /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    var standalone = nav.standalone === true
      || window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || window.matchMedia('(display-mode: minimal-ui)').matches;
    if (!ios || !standalone) return;
    var root = document.documentElement;
    root.classList.add('crm-ios-pwa');
    /* 100vh/100lvh = full screen in standalone; 100dvh subtracts the notch. */
    root.style.setProperty('--crm-app-height', '100vh');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={barlow.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${barlow.className} antialiased`}>
        <ThemeProvider>
          <DisplayDensityProvider>
            <IosPwaViewport />
            <ToastProvider>
              <NetworkStatusProvider>
                <SwUpdateProvider>
                  <PwaInstallProvider>
                    <TooltipProvider>
                      <AuthProvider>{children}</AuthProvider>
                    </TooltipProvider>
                  </PwaInstallProvider>
                </SwUpdateProvider>
              </NetworkStatusProvider>
            </ToastProvider>
          </DisplayDensityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
