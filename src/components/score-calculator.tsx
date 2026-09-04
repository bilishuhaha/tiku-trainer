"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, ChevronDown, CircleDot, Ruler, Timer } from "lucide-react";
import { MAX_SCORE, nextTarget, perfForScore, scoreFor } from "@/lib/gd-score";
import type { EventKey, Gender } from "@/lib/gd-score";

const ROWS: { key: EventKey; label: string; unit: string; icon: typeof Timer; placeholder: string }[] = [
  { key: "sprint", label: "100 米跑", unit: "秒", icon: Timer, placeholder: "如 12.30" },
  { key: "tripleJump", label: "立定三级跳远", unit: "米", icon: Ruler, placeholder: "如 8.75" },
  { key: "shotPut", label: "原地推铅球", unit: "米", icon: CircleDot, placeholder: "如 10.38" },
];

const fmt = (n: number) => n.toFixed(2);

function tone(score: number) {
  if (score >= 60) return { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", text: "text-emerald-700" };
  if (score >= 40) return { bar: "bg-sky-500", chip: "bg-sky-50 text-sky-700 ring-sky-200", text: "text-sky-700" };
  if (score >= 20) return { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200", text: "text-amber-700" };
  if (score >= 1) return { bar: "bg-rose-400", chip: "bg-rose-50 text-rose-600 ring-rose-200", text: "text-rose-600" };
  return { bar: "bg-slate-300", chip: "bg-slate-100 text-slate-500 ring-slate-200", text: "text-slate-500" };
}

const STORAGE_KEY = "tiku-calc-open";

export default function ScoreCalculator() {
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState<Gender>("male");
  const [values, setValues] = useState<Record<EventKey, string>>({ sprint: "", tripleJump: "", shotPut: "" });
  const [showEstimate, setShowEstimate] = useState(false);
  const [culture, setCulture] = useState("");
  const [special, setSpecial] = useState("");

  // 记住上次展开/收起状态，避免每次进主页都要重新展开
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setOpen(true);
    } catch {
      // 忽略隐私模式等场景
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      // 忽略
    }
  }, [open]);

  const parsed = useMemo(() => {
    const out = {} as Record<EventKey, number | null>;
    for (const r of ROWS) {
      const raw = values[r.key].trim();
      if (raw === "") { out[r.key] = null; continue; }
      const n = Number(raw);
      out[r.key] = Number.isFinite(n) && n > 0 ? n : null;
    }
    return out;
  }, [values]);

  const scores = useMemo(() => {
    const out = {} as Record<EventKey, number>;
    for (const r of ROWS) {
      const v = parsed[r.key];
      out[r.key] = v == null ? 0 : scoreFor(gender, r.key, v);
    }
    return out;
  }, [gender, parsed]);

  const total = scores.sprint + scores.tripleJump + scores.shotPut;

  const specialNum = special.trim() === "" ? null : Number(special);
  const specialOk = specialNum != null && Number.isFinite(specialNum) && specialNum >= 0 && specialNum <= 75;
  const specialVal = specialOk && specialNum != null ? specialNum : 0;
  const cultureNum = culture.trim() === "" ? null : Number(culture);
  const cultureOk = cultureNum != null && Number.isFinite(cultureNum) && cultureNum >= 0 && cultureNum <= 750;
  const shuke = total + specialVal;
  const zonghe = cultureOk && cultureNum != null ? cultureNum * 0.4 + shuke * 2.5 * 0.6 : null;

  function setValue(key: EventKey, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  return (
    <section className="no-print card overflow-hidden">
      {/* 可折叠标题栏：点击整行展开/收起 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition hover:bg-slate-50/60 sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
            <Calculator className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-slate-900">广东体育术科 · 成绩算分器</span>
            <span className="block truncate text-xs text-slate-500">按省考试院术科评分表即时算分，单项满分 75，三项满分 225</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            {open ? "收起" : "展开算分"}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-3 px-4 py-4 sm:px-5">
          {/* 性别切换 */}
          <div className="flex justify-end">
            <div className="flex shrink-0 items-center rounded-xl bg-slate-100 p-1 text-sm" role="group" aria-label="性别">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`rounded-lg px-4 py-1.5 font-medium transition-colors ${
                    gender === g ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {g === "male" ? "男" : "女"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROWS.map((r) => {
              const v = parsed[r.key];
              const sc = scores[r.key];
              const t = tone(sc);
              const pct = Math.max(0, Math.min(100, (sc / MAX_SCORE) * 100));
              const maxLine = perfForScore(gender, r.key, MAX_SCORE);
              const minLine = perfForScore(gender, r.key, 1);
              const nt = v != null ? nextTarget(gender, r.key, v) : null;
              return (
                <div key={r.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                    <r.icon className="h-4 w-4 text-slate-400" />
                    {r.label}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      className="input pr-10 text-[15px]"
                      placeholder={r.placeholder}
                      value={values[r.key]}
                      onChange={(e) => setValue(r.key, e.target.value)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{r.unit}</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-bold ring-1 ${t.chip}`}>
                      {v == null ? "—" : sc}
                      <span className="ml-0.5 text-[10px] font-normal opacity-70">/75分</span>
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                      <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${v == null ? 0 : pct}%` }} />
                    </div>
                  </div>
                  <div className="mt-1.5 min-h-[14px] text-[11px] leading-snug text-slate-400">
                    {v == null ? (
                      <span>满分线 {fmt(maxLine)} {r.unit} · 1 分线 {fmt(minLine)} {r.unit}</span>
                    ) : sc >= MAX_SCORE ? (
                      <span className="text-emerald-600">已达满分 🎉</span>
                    ) : sc <= 0 ? (
                      <span className="text-rose-500">未达 1 分线（需 {r.key === "sprint" ? "≤" : "≥"} {fmt(minLine)} {r.unit}）</span>
                    ) : nt ? (
                      <span>
                        再{r.key === "sprint" ? "快" : "远"} {fmt(nt.delta)} {r.unit} → {nt.score} 分
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 合计 */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
            <div className="text-sm text-slate-600">
              三项合计（基本素质）
              <span className="ml-2 text-2xl font-extrabold tracking-tight text-emerald-700">{total}</span>
              <span className="text-slate-400"> / 225 分</span>
              {specialOk && specialNum != null && (
                <span className="ml-3 text-xs text-slate-500">含专项基础后术科：<b className="text-slate-700">{shuke}</b> / 300 分</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowEstimate((s) => !s)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              估算综合分
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showEstimate ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showEstimate && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="gd-culture">文化课成绩（满分 750）</label>
                  <div className="relative">
                    <input
                      id="gd-culture"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="750"
                      step="0.5"
                      className={`input pr-10 ${culture.trim() !== "" && !cultureOk ? "border-rose-400" : ""}`}
                      placeholder="如 480"
                      value={culture}
                      onChange={(e) => setCulture(e.target.value)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">分</span>
                  </div>
                  {culture.trim() !== "" && !cultureOk && <p className="mt-1 text-[11px] text-rose-500">请输入 0–750 之间的分数</p>}
                </div>
                <div>
                  <label className="label" htmlFor="gd-special">选考专项基础分（满分 75，可留空）</label>
                  <div className="relative">
                    <input
                      id="gd-special"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="75"
                      step="0.5"
                      className={`input pr-10 ${special.trim() !== "" && !specialOk ? "border-rose-400" : ""}`}
                      placeholder="如 60"
                      value={special}
                      onChange={(e) => setSpecial(e.target.value)}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">分</span>
                  </div>
                  {special.trim() !== "" && !specialOk && <p className="mt-1 text-[11px] text-rose-500">请输入 0–75 之间的分数</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="text-slate-500">
                  术科成绩：<b className="text-slate-800">{shuke}</b> / 300 分
                </span>
                <span className="text-slate-500">
                  预估综合分：
                  <b className="text-lg text-emerald-700">{zonghe == null ? "—" : zonghe.toFixed(1)}</b>
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                公式（省考试院 2026 年报名办法）：综合分 = 文化课 × 40% + 术科成绩 × 2.5 × 60%。
                {!specialOk || specialNum == null ? " 专项基础分未填时按 0 分估算，仅体现三项成绩。" : ""}
                {zonghe == null ? " 填写文化课成绩后可估算综合分。" : ""}
              </p>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-slate-400">
            评分表依据：广东省教育考试院体育类专业省统考《考试说明》基本素质①（100 米 / 立定三级跳远 / 原地推铅球）评分表，表 1–表 6；
            广东近年来该三项评分表数值保持一致，如省考试院发布新版说明，请以当年官方公布为准。
          </p>
        </div>
      )}
    </section>
  );
}
