import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: { default: "体育高考训练助手", template: "%s · 体育高考训练助手" },
  description: "面向体育高考（100米 / 立定三级跳远 / 原地推铅球）的 AI 周期化训练计划工具",
  applicationName: "体育高考训练助手",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "体考助手",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
