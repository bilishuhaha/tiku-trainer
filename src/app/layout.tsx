import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "体育高考训练助手", template: "%s · 体育高考训练助手" },
  description: "面向体育高考（100米 / 立定三级跳远 / 原地推铅球）的 AI 周期化训练计划工具",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
