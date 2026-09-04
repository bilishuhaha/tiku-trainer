"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { setCheckinStateAction } from "@/lib/actions";

/**
 * 学生“打卡 / 撤销”：点击后立即在本地切换（不等服务器），
 * 后台再同步到服务器，失败才回退——避免跨区网络带来的点击“卡顿感”。
 */
export default function CheckinControl({
  planId,
  date,
  dayIndex,
  initialDone,
}: {
  planId: string;
  date: string;
  dayIndex: number;
  initialDone: boolean;
}) {
  const [done, setDone] = useState(initialDone);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function flip(next: boolean) {
    if (pending) return;
    setError(null);
    setDone(next); // 乐观更新：点击立即生效
    const fd = new FormData();
    fd.set("planId", planId);
    fd.set("date", date);
    fd.set("dayIndex", String(dayIndex));
    fd.set("done", next ? "1" : "0");

    startTransition(async () => {
      try {
        const r = await setCheckinStateAction(fd);
        if (!r.ok) {
          setDone(!next);
          setError(r.error || "操作失败，请重试");
          return;
        }
        // 后台刷新本周其它打卡圆点，保证与服务器一致（不整页跳转）
        router.refresh();
      } catch {
        setDone(!next);
        setError("网络开小差了，请稍后重试");
      }
    });
  }

  if (done) {
    return (
      <div>
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /> 今天已完成，很棒！
          </span>
          <button
            type="button"
            onClick={() => flip(false)}
            disabled={pending}
            className="text-xs text-slate-400 hover:text-rose-500 disabled:opacity-50"
          >
            {pending ? "同步中…" : "撤销"}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => flip(true)}
        disabled={pending}
        className="btn w-full bg-emerald-600 py-3 text-base text-white hover:bg-emerald-700 disabled:opacity-70"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> 同步中…
          </>
        ) : (
          "练完了，打卡 ✓"
        )}
      </button>
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
