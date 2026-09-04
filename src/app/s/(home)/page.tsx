import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Flame, BedDouble, Target, CalendarDays, ChevronDown } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { findActivePlan, findStudentById, listCheckins, listGoals } from "@/lib/repo";
import { toggleCheckinAction, setMyWeekdaysAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";
import { EVENTS, EVENT_ORDER, itemUnit } from "@/lib/domain/items";
import type { PlanDoc, DayDoc, BlockDoc } from "@/lib/domain/types";
import { localDateKey, weeksUntil } from "@/lib/format";
import {
  WEEKDAY_LABELS, buildWeek, currentPhase, defaultWeekdays, parseWeekdays, planWeekIndex, weekdayOf,
} from "@/lib/student-view";

export const metadata = { title: "我的训练" };

export default async function StudentHomePage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error } = await searchParams;
  const me = await requireStudent();
  const student = await findStudentById(me.id);
  if (!student) redirect("/s/login");

  const plan = await findActivePlan(student.id);
  const goals = await listGoals(student.id);

  const today = new Date();
  const todayWd = weekdayOf(today);
  const todayLabel = WEEKDAY_LABELS[todayWd - 1];
  const dateText = `${today.getMonth() + 1}月${today.getDate()}日`;

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} />

      {/* 问候 + 目标 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{student.name}，今天也要加油 💪</h1>
        <p className="mt-0.5 text-sm text-slate-500">{dateText} · {todayLabel}</p>
      </div>

      {goals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {EVENT_ORDER.map((ev) => {
            const g = goals.find((x) => x.event === ev);
            if (!g) return null;
            return (
              <span key={ev} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                目标 {EVENTS[ev].shortLabel} <b className="text-slate-900">{g.target.toFixed(2)}</b>{itemUnit(EVENTS[ev].primaryItem)}
              </span>
            );
          })}
        </div>
      )}

      {student.injuryNote && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          ⚠️ 注意：{student.injuryNote}
        </div>
      )}

      {!plan ? (
        <NoPlanCard />
      ) : (
        <PlanBody studentId={student.id} studentWeekdays={student.weekdays} planId={plan.id} planCreatedAt={plan.createdAt} planStartDate={plan.startDate} planStatus={plan.status} structure={plan.structure} />
      )}

      <p className="pb-6 pt-2 text-center text-[11px] text-slate-400">
        训练计划由教练在系统内生成 · 如内容与身体不适，请及时告诉教练
      </p>
    </div>
  );
}

function NoPlanCard() {
  return (
    <div className="card p-8 text-center">
      <div className="text-4xl">📋</div>
      <p className="mt-3 font-medium text-slate-700">还没有训练计划</p>
      <p className="mt-1 text-sm text-slate-400">教练为你生成计划后，这里会显示每天练什么。</p>
      <Link href="/s" className="btn btn-outline mt-4 text-sm">刷新看看</Link>
    </div>
  );
}

async function PlanBody({ studentId, studentWeekdays, planId, planCreatedAt, planStartDate, planStatus, structure }: {
  studentId: string;
  studentWeekdays: string | null;
  planId: string;
  planCreatedAt: string;
  planStartDate: string | null;
  planStatus: string;
  structure: string;
}) {
  const doc: PlanDoc = JSON.parse(structure);
  const k = doc.meta.daysPerWeek ?? 6;
  const chosen = parseWeekdays(studentWeekdays);
  const needsPick = chosen.length !== k;

  if (needsPick) {
    const preset = chosen.length ? chosen : defaultWeekdays(k);
    return <WeekdayPicker k={k} preset={preset} />;
  }

  const today = new Date();
  const weekIndex = planWeekIndex(planStartDate, planCreatedAt, today);
  const { period, weekNumber, totalWeeks, phaseKey } = currentPhase(doc, weekIndex);
  const week = buildWeek(period, chosen, today);
  const checkins = await listCheckins(planId);
  const doneByDate = new Map(checkins.map((c) => [c.date, c]));

  const todayWd = weekdayOf(today);
  const todayEntry = week.find((w) => w.weekday === todayWd) ?? week[0];
  const weeksToExam = weeksUntil(doc.meta.examDate ?? null);

  return (
    <>
      {/* 阶段提示 */}
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2.5 text-white">
        <span className="text-sm font-medium">{period.name}</span>
        <span className="text-xs text-slate-300">第 {weekNumber} / {totalWeeks} 周 · 每周练 {k} 天</span>
      </div>

      {/* 今日 */}
      <TodayCard todayEntry={todayEntry} done={doneByDate.get(localDateKey(today)) ? true : false}
        planId={planId} todayDate={localDateKey(today)} week={week} todayWd={weekdayOf(today)} planStatus={planStatus} weeksToExam={weeksToExam} phaseKey={phaseKey} />

      {/* 本周安排 */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">本周安排（点开看内容）</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {week.map((w) => {
            const done = doneByDate.get(w.dateKey);
            const isToday = w.weekday === todayWd;
            return (
              <div key={w.dateKey} className={isToday ? "bg-emerald-50/60" : ""}>
                {w.isRest ? (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <DayBadge label={w.label} muted />
                    <span className="text-sm text-slate-400">休息 / 恢复</span>
                    {done && <DoneDot />}
                  </div>
                ) : (
                  <details>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                      <DayBadge label={w.label} active={isToday} />
                      <span className="flex-1 text-sm">
                        <span className={isToday ? "font-semibold text-slate-900" : "text-slate-700"}>
                          {w.dayIndex} · {w.day!.title}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">约 {w.day!.durationMin} 分钟</span>
                      </span>
                      {done ? <DoneDot /> : null}
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
                    </summary>
                    <div className="space-y-2.5 px-4 pb-4">
                      {w.day!.blocks.map((b, i) => <BlockCompact key={i} block={b} />)}
                      {w.day!.techNotes.map((t, i) => (
                        <p key={i} className="text-xs text-slate-500">💡 {t}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function WeekdayPicker({ k, preset }: { k: number; preset: number[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-emerald-600" />
        <h2 className="font-semibold text-slate-900">先选一下：你每周哪几天训练？</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">你的计划是每周练 <b>{k}</b> 天，请选正好 {k} 天（按你实际能练的时间）</p>
      <form action={setMyWeekdaysAction} className="mt-4">
        <div className="grid grid-cols-4 gap-2">
          {WEEKDAY_LABELS.map((label, i) => {
            const val = i + 1;
            return (
              <label key={val} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:font-semibold has-[:checked]:text-emerald-700">
                <input type="checkbox" name="wd" value={val} defaultChecked={preset.includes(val)} className="hidden" />
                {label}
              </label>
            );
          })}
        </div>
        <button type="submit" className="btn btn-dark mt-4 w-full">保存我的训练日</button>
      </form>
      <p className="mt-2 text-center text-xs text-slate-400">之后想改，随时可以回来调整</p>
    </div>
  );
}

function TodayCard({ todayEntry, done, planId, todayDate, week, todayWd, planStatus, weeksToExam, phaseKey }: {
  todayEntry: { isRest: boolean; day: DayDoc | null; label: string; dayIndex: number | null };
  done: boolean;
  planId: string;
  todayDate: string;
  week: { label: string; day: DayDoc | null; isRest: boolean }[];
  todayWd: number;
  planStatus: string;
  weeksToExam: number | null;
  phaseKey: string;
}) {
  const next = week.slice(todayWd).find((w) => !w.isRest) ?? week.find((w) => !w.isRest);
  if (todayEntry.isRest) {
    return (
      <div className="card p-6 text-center">
        <div className="text-4xl">🛌</div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">今天是休息 / 恢复日</h2>
        <p className="mt-1 text-sm text-slate-500">练得好也要恢复得好</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <RestTip icon={<Flame className="h-4 w-4" />} title="20-30 分钟" sub="慢跑或快走" />
          <RestTip icon={<BedDouble className="h-4 w-4" />} title="睡够 7-9 小时" sub="让身体修复" />
          <RestTip icon={<Target className="h-4 w-4" />} title="拉伸放松" sub="重点：腿后侧/髋" />
        </div>
        {next?.day && (
          <p className="mt-4 text-sm text-slate-600">下次训练：{next.label} · {next.day.title}</p>
        )}
        {phaseKey === "taper" && <p className="mt-2 text-xs text-amber-600">考前调整期：休息是为了考试时状态更好</p>}
      </div>
    );
  }
  const d = todayEntry.day!;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-emerald-600 px-5 py-3 text-white">
        <div>
          <div className="text-xs text-emerald-100">今天 · {todayEntry.label}</div>
          <h2 className="text-lg font-bold">第 {todayEntry.dayIndex} 练 · {d.title}</h2>
        </div>
        <div className="text-right text-xs text-emerald-100">
          <div>约 {d.durationMin} 分钟</div>
          {weeksToExam !== null && <div>距考试 {weeksToExam} 周</div>}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {d.blocks.map((b, i) => <BlockCompact key={i} block={b} highlight={b.kind === "main"} />)}
        {d.techNotes.map((t, i) => (
          <p key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">💡 {t}</p>
        ))}
      </div>
      <div className="border-t border-slate-100 p-4">
        {done ? (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-5 w-5" /> 今天已完成，很棒！
            </span>
            <form action={toggleCheckinAction}>
              <input type="hidden" name="planId" value={planId} />
              <input type="hidden" name="date" value={todayDate} />
              <input type="hidden" name="dayIndex" value={String(todayEntry.dayIndex ?? 0)} />
              <button type="submit" className="text-xs text-slate-400 hover:text-rose-500">撤销</button>
            </form>
          </div>
        ) : (
          <form action={toggleCheckinAction}>
            <input type="hidden" name="planId" value={planId} />
            <input type="hidden" name="date" value={todayDate} />
            <input type="hidden" name="dayIndex" value={String(todayEntry.dayIndex ?? 0)} />
            <button type="submit" className="btn w-full bg-emerald-600 py-3 text-base text-white hover:bg-emerald-700">
              练完了，打卡 ✓
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function BlockCompact({ block, highlight }: { block: BlockDoc; highlight?: boolean }) {
  return (
    <div>
      <div className={`mb-1 text-xs font-semibold ${highlight ? "text-emerald-700" : "text-slate-500"}`}>{block.label}</div>
      <div className="space-y-1">
        {block.items.map((it, i) => (
          <div key={i} className="rounded-lg bg-slate-50 px-3 py-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-sm text-slate-800">{it.name}</span>
              <span className="text-sm font-medium tabular-nums text-slate-600">{it.dose}</span>
            </div>
            {(it.intensity || it.rest) && (
              <div className="text-[11px] text-slate-400">
                {[it.intensity, it.rest].filter(Boolean).join(" · ")}
              </div>
            )}
            {it.cue && <div className="text-[11px] text-slate-500">{it.cue}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayBadge({ label, active, muted }: { label: string; active?: boolean; muted?: boolean }) {
  const cls = muted
    ? "bg-slate-100 text-slate-400"
    : active
      ? "bg-emerald-600 text-white"
      : "bg-slate-900 text-white";
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${cls}`}>{label.replace("周", "")}</span>;
}

function DoneDot() {
  return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
}

function RestTip({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="mx-auto mb-1 flex justify-center text-emerald-600">{icon}</div>
      <div className="text-xs font-semibold text-slate-700">{title}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}
