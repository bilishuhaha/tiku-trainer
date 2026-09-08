"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, Check } from "lucide-react";

const KEY = "tiku-disclaimer-v1";

/** 学生端进入时弹出“训练安全须知”，确认后本浏览器会话内不再重复 */
export default function PlanDisclaimerModal() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") setShow(false);
    } catch {
      // 忽略隐私模式
    }
  }, []);

  if (!show) return null;

  function confirm() {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      // 忽略
    }
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">训练安全须知</h3>
        </div>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
          <li>🧭 本训练计划<b>仅供参考</b>，请结合当天身体状态灵活执行。</li>
          <li>🛡️ 没有教练在场时，请<b>量力而行、循序渐进</b>，动作先求标准，再上强度。</li>
          <li>⚠️ 一旦感到<b>疼痛或明显不适，立即停止</b>，不要硬撑；有旧伤请先咨询医生或教练。</li>
          <li>⚖️ 状态不好时允许自己<b>减量</b>（组数、次数、重量、速度），安全永远第一。</li>
        </ul>
        <button
          type="button"
          onClick={confirm}
          className="btn mt-5 w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700"
        >
          <Check className="h-4 w-4" /> 已阅读，我会量力而行
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">确认后本次进入不再弹出</p>
      </div>
    </div>
  );
}
