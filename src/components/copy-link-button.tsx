"use client";

import { useState } from "react";
import { Check, Link2, Loader2 } from "lucide-react";

export default function CopyLinkButton({ url, label = "新生报名链接" }: { url: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copying" | "ok">("idle");

  async function copy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(url);
      setState("ok");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
      window.prompt("复制这条报名链接发给学生：", url);
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-outline text-xs" title={url}>
      {state === "copying" ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> 复制中…</>
      ) : state === "ok" ? (
        <><Check className="h-4 w-4 text-emerald-600" /> 已复制 ✓</>
      ) : (
        <><Link2 className="h-4 w-4" /> {label}</>
      )}
    </button>
  );
}
