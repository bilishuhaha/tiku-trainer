"use client";

import { useRef, useState } from "react";
import { Copy, Check, KeyRound, ShieldCheck } from "lucide-react";

/** 学生自动开通后：弹窗显示访问码，提醒先复制保存再开始 */
export default function AccessCodeModal({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(true);
  const codeRef = useRef<HTMLDivElement>(null);

  async function copy() {
    const text = code;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // 兜底：选中文本让用户手动复制
      const sel = window.getSelection();
      const range = document.createRange();
      if (codeRef.current) {
        range.selectNodeContents(codeRef.current);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      ok = true; // 已选中，用户 Ctrl/长按复制
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h3 className="text-base font-bold">{name}，已为你开通训练 🎉</h3>
          </div>
          <p className="mt-1 text-xs text-emerald-50/90">这是你以后登录的专属访问码，请先复制保存好</p>
        </div>
        <div className="p-5">
          <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/70 py-4 text-center">
            <div ref={codeRef} className="select-all px-2 text-3xl font-black tracking-[0.28em] text-slate-900">{code}</div>
            <p className="mt-1 text-[11px] text-slate-400">学生入口：输入这个码即可进入我的训练（建议截图或抄下来）</p>
          </div>
          <button
            type="button"
            onClick={copy}
            className={`btn mt-4 w-full ${copied ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-900 text-white hover:bg-slate-700"}`}
          >
            {copied ? (<><Check className="h-4 w-4" /> 已复制到剪贴板</>) : (<><Copy className="h-4 w-4" /> 复制访问码</>)}
          </button>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="btn btn-outline mt-2 w-full text-sm"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> 我已保存访问码，开始训练
          </button>
          <p className="mt-2 text-center text-[11px] text-amber-600">⚠️ 关闭前请确认已复制/保存，之后丢了要联系教练重置</p>
        </div>
      </div>
    </div>
  );
}
