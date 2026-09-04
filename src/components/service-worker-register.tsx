"use client";

import { useEffect } from "react";

/**
 * 注册 Service Worker，让站点可安装到手机桌面（PWA，App 外观、点开是网页）。
 * 仅在生产构建注册；开发模式下不注册，避免干扰本地热更新。
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const proto = window.location.protocol;
    const host = window.location.hostname;
    if (proto !== "https:" && host !== "localhost" && host !== "127.0.0.1") return;

    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 注册失败不影响正常使用，仅静默忽略
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
