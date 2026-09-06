"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Loader2 } from "lucide-react";
import { dismissPlanNoticeAction } from "@/lib/actions";

/** 学生端：教练更新计划后显示的提示条，点击“知道了”标记已读 */
export default function PlanUpdatedBanner({ planId }: { planId: string }) {
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (hidden) return null;

  async function ack() {
    if (busy) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("planId", planId);
    try {
      const r = await dismissPlanNoticeAction(fd);
      if (r.ok) {
        setHidden(true);
        router.refresh();
      }
    } catch {
      // 失败留在原地即可
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/70 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
          <BellRing className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">教练更新了你的训练计划</div>
          <div className="text-xs text-slate-500">下方已是新版安排；如果和你在练的不同，请按最新版执行。</div>
        </div>
      </div>
      <button
        type="button"
        onClick={ack}
        disabled={busy}
        className="btn btn-dark shrink-0 text-xs disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 已读中…
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" /> 知道了
          </>
        )}
      </button>
    </div>
  );
}
