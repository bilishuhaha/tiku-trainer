"use client";

import { useEffect, useRef, useState } from "react";
import { Download, MonitorDown, Share, Smartphone, X } from "lucide-react";

type Mode = "loading" | "install" | "ios" | "guide" | "hidden";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/(CriOS|FxiOS|OPiOS|EdgiOS|wv)/i.test(navigator.userAgent);
}

/** “添加到桌面/主屏幕”按钮：安卓/桌面 Chrome 直接唤起系统安装，iPhone 弹出图文步骤引导。 */
export default function AddToHome() {
  const [mode, setMode] = useState<Mode>("loading");
  const [open, setOpen] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) {
      setMode("hidden"); // 已经是以 App 形态打开，无需再添加
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setMode("install");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // iOS Safari 不会触发 beforeinstallprompt，只能给步骤引导
    if (isIOS()) setMode("ios");
    else setMode("guide"); // 触发到 beforeinstallprompt 后自动升级为可直接安装
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "loading" || mode === "hidden") return null;

  const label = mode === "ios" ? "添加到主屏幕" : "添加到桌面";

  async function handleClick() {
    const evt = deferred.current;
    if (mode === "install" && evt && typeof evt.prompt === "function") {
      try {
        await evt.prompt();
        const choice = await evt.userChoice;
        if (choice.outcome === "accepted") {
          setMode("hidden");
          return;
        }
      } catch {
        // 某些浏览器不允许重复唤起，退化为步骤引导
      }
      deferred.current = null;
      setMode("guide");
      setOpen(true);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white/85 px-4 py-2 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur transition hover:border-emerald-400 hover:bg-emerald-50"
      >
        {mode === "ios" ? <Smartphone className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
                  {mode === "ios" ? <Smartphone className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /> : <MonitorDown className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />}
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {mode === "ios" ? "添加到主屏幕" : "添加到桌面"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {mode === "ios" ? (
              <ol className="mt-4 space-y-3">
                <Step n={1} title="打开 Safari 底部的分享按钮">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    <Share className="h-3.5 w-3.5" /> 分享（方框+上箭头）
                  </span>
                </Step>
                <Step n={2} title="选择「添加到主屏幕」" desc="在弹出的菜单里向下找，点它。" />
                <Step n={3} title="点右上角「添加」" desc="完成后桌面会出现“体考助手”图标，点开就像原生 App 一样全屏使用。" />
              </ol>
            ) : mode === "install" ? (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>你的浏览器已支持直接安装，点下面的按钮即可弹窗安装：</p>
                <button
                  type="button"
                  onClick={handleClick}
                  className="btn btn-primary w-full"
                >
                  <Download className="h-4 w-4" /> 安装「体考助手」
                </button>
              </div>
            ) : (
              <ol className="mt-4 space-y-3">
                <Step n={1} title="打开浏览器菜单" desc="安卓 Chrome 点右上角「⋮」，电脑 Chrome 点地址栏右侧图标。" />
                <Step n={2} title="选择「安装应用 / 添加到主屏幕」" desc="若暂时没有该选项，多打开几次本网站后 Chrome 会自动出现“安装”提示。" />
                <Step n={3} title="确认安装" desc="之后桌面/开始菜单会出现“体考助手”图标，点击即可全屏打开。" />
              </ol>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn btn-outline mt-5 w-full"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, title, desc, children }: { n: number; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
        {n}
      </span>
      <div className="text-xs leading-relaxed text-slate-600">
        <div className="font-semibold text-slate-800">{title}</div>
        {desc ? <div className="mt-0.5 text-slate-500">{desc}</div> : null}
        {children}
      </div>
    </li>
  );
}

