"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { LOCK_THRESHOLD } from "@/lib/attendance-shared";

/** 学生端：缺勤提醒弹窗（第 1/2 次警告），点击“知道了”后关闭 */
export default function AttendanceWarnModal({ missed, name }: { missed: number; name: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const left = LOCK_THRESHOLD - missed;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900">缺勤提醒（第 {missed} / {LOCK_THRESHOLD} 次）</h3>
            <p className="mt-0.5 text-xs text-slate-400">{name}，训练要认真对待哦</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          你已经有 <b className="text-rose-600">{missed} 次</b>训练没有打卡了。
          再缺 <b className="text-rose-600">{left} 次</b>，系统将自动封锁，需要联系教练才能解锁。
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">如果身体不舒服或有事，请在“训练反馈”里提前告诉教练，不会算你缺勤。</p>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-dark mt-4 w-full">
          我知道了，认真训练 <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

