import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Flame, BedDouble, Target, CalendarDays, ChevronDown, MessageSquare, Lock } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { findActivePlan, findStudentById, listApprovedLeaveDates, listCheckins, listFeedbackByStudent, listGoals, listLeavesByStudent, syncAttendance } from "@/lib/repo";
import { adjustMyPlanFromFeedbackAction, setMyWeekdaysAction, studentLeaveAction, submitFeedbackAction } from "@/lib/actions";
import { ErrorBanner, OkBanner } from "@/components/error-banner";
import CheckinControl from "@/components/student-checkin";
import AttendanceWarnModal from "@/components/attendance-warn";
import PlanUpdatedBanner from "@/components/plan-updated-banner";
import PendingSubmitButton from "@/components/pending-submit-button";
import ScoreCalculator from "@/components/score-calculator";
import PlanDisclaimerModal from "@/components/plan-disclaimer";
import { EVENTS, EVENT_ORDER, itemUnit } from "@/lib/domain/items";
import type { PlanDoc, DayDoc, BlockDoc } from "@/lib/domain/types";
import { localDateKey, weeksUntil } from "@/lib/format";
import { LOCK_THRESHOLD, MUST_READ, computeMissed } from "@/lib/attendance";
import {
  WEEKDAY_LABELS, buildWeek, currentPhase, defaultWeekdays, parseWeekdays, planWeekIndex, weekdayOf,
} from "@/lib/student-view";

export const metadata = { title: "我的训练" };

export default async function StudentHomePage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const me = await requireStudent();
  // 并行查询：减少跨区网络下“点开页面”的等待
  const [student, plan, goals, feedback, approvedLeaveDates, leaves] = await Promise.all([
    findStudentById(me.id),
    findActivePlan(me.id),
    listGoals(me.id),
    listFeedbackByStudent(me.id, 6),
    listApprovedLeaveDates(me.id),
    listLeavesByStudent(me.id, 6),
  ]);
  if (!student) redirect("/s/login");

  // 计划类型：single=单招专项（100米+急行跳远），否则按统考（术科）展示
  const planProgram = plan
    ? ((JSON.parse(plan.structure) as { meta?: { program?: "single" | "gaokao" } }).meta?.program ?? "gaokao")
    : null;

  const today = new Date();
  const todayWd = weekdayOf(today);
  const todayLabel = WEEKDAY_LABELS[todayWd - 1];
  const dateText = `${today.getMonth() + 1}月${today.getDate()}日`;

  // ===== 考勤：连续未打卡计数 / 封锁 =====
  let missed = 0;
  let locked = Number(student.locked) === 1;
  if (plan && parseWeekdays(student.weekdays).length > 0) {
    const chk = await listCheckins(plan.id);
    missed = computeMissed(plan, student.weekdays, new Set(chk.map((x) => x.date)), new Set(approvedLeaveDates));
    locked = missed >= LOCK_THRESHOLD || Number(student.locked) === 1;
    if (missed !== Number(student.missedCount) || (locked ? 1 : 0) !== Number(student.locked)) {
      await syncAttendance(student.id, missed, locked ? 1 : 0);
    }
  }
  if (locked) {
    return <LockedPanel name={student.name} />;
  }

  return (
    <div className="space-y-4">
      <PlanDisclaimerModal />
      <ErrorBanner error={error} />
      <OkBanner ok={ok === "adjusted" ? "已根据你的反馈重新生成了训练计划 ✓ 本周安排已更新（若强度仍不合适，请继续提交反馈）" : ok === "fb" ? "反馈已保存 ✓ 教练会看到，并据此调整你的计划" : ok === "leave" ? "请假已提交，教练批准后当天不算缺勤 ✓" : ok === "enrolled" ? `🎉 已自动为你开通训练！你的访问码：${student.accessCode ?? "（见档案）"}（请保存，下次可用它登录）。档案与第一版训练计划都已自动生成（教练那边也能看到），选好每周训练日即可开始！` : null} />


      {/* 缺勤警告弹窗（第 1/2 次） */}
      {!locked && missed > 0 && missed < LOCK_THRESHOLD && (
        <AttendanceWarnModal missed={missed} name={student.name} />
      )}

      {/* 训练前必读公告 */}
      <NoticeCard />

      {/* 教练更新计划提示 */}
      {plan && plan.noticeRev > plan.seenRev && <PlanUpdatedBanner planId={plan.id} />}

      {/* 问候 + 目标 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{student.name}，今天也要加油 💪</h1>
        <p className="mt-0.5 text-sm text-slate-500">{dateText} · {todayLabel}</p>
      </div>

      {/* 单招专项考生提示：明确考试项目（学生端只读提示，无生成入口） */}
      {planProgram === "single" && plan && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="text-sm font-semibold text-violet-800">🏅 你是「单招专项」考生</div>
          <p className="mt-0.5 text-xs leading-relaxed text-violet-700">考试项目：<b>100 米 + 急行跳远（助跑跳远）</b>。你的训练与成绩目标只围绕这两项进行，不涉及铅球 / 三级跳远。</p>
        </div>
      )}

      {planProgram !== "single" && goals.length > 0 && (
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

      {/* 广东术科算分器（学生自测）——仅统考考生展示 */}
      {planProgram !== "single" && <ScoreCalculator />}

      {!plan ? (
        <NoPlanCard />
      ) : (
        <PlanBody studentId={student.id} studentWeekdays={student.weekdays} planId={plan.id} planCreatedAt={plan.createdAt} planStartDate={plan.startDate} planStatus={plan.status} structure={plan.structure} />
      )}

      {/* 训练反馈 */}
      {plan && (
        <FeedbackCard recent={feedback} />
      )}

      {/* 请假/告知教练 */}
      {plan && (
        <LeaveCard recent={leaves} />
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
        <PendingSubmitButton className="btn btn-dark mt-4 w-full" pendingText="保存中…">保存我的训练日</PendingSubmitButton>
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
        <CheckinControl planId={planId} date={todayDate} dayIndex={todayEntry.dayIndex ?? 0} initialDone={done} />
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





const FEEL_OPTIONS = [
  { v: 1, label: "很轻松" },
  { v: 2, label: "正好" },
  { v: 3, label: "偏累" },
  { v: 4, label: "很累" },
  { v: 5, label: "练不动" },
];
const FEEL_ICON = ["", "😄", "🙂", "😮‍💨", "😫", "🥵"];
function feelLabel(v: number | null) {
  if (!v) return "";
  return FEEL_OPTIONS.find((o) => o.v === v)?.label ?? "";
}

function FeedbackCard({ recent }: { recent: { date: string; feel: number | null; soreness: string | null; note: string | null }[] }) {
  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-emerald-600" />
        <h2 className="font-semibold text-slate-900">练完写个反馈（几秒钟）</h2>
      </div>
      <p className="mb-3 text-xs text-slate-500">会同步给教练；也可以点下面按钮，按你自己的反馈<b>立即自动调整计划</b>。</p>
      <form action={submitFeedbackAction} className="space-y-3">
        <input type="hidden" name="date" value={localDateKey(new Date())} />
        <div>
          <div className="label">今天练得怎么样？</div>
          <div className="grid grid-cols-5 gap-1.5">
            {FEEL_OPTIONS.map((o) => (
              <label key={o.v} className="flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-1 py-2 text-center text-[11px] text-slate-600 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:font-semibold has-[:checked]:text-emerald-700">
                <input type="radio" name="feel" value={o.v} className="hidden" />
                <span className="text-base leading-none">{FEEL_ICON[o.v]}</span>
                {o.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="fb-sore">身体有没有不适？</label>
          <select id="fb-sore" name="soreness" defaultValue="" className="input">
            <option value="">没有特别不适</option>
            <option value="正常肌肉酸痛">正常肌肉酸痛（练后第 2 天明显）</option>
            <option value="膝盖">膝盖</option>
            <option value="脚踝">脚踝</option>
            <option value="小腿">小腿</option>
            <option value="大腿">大腿</option>
            <option value="腰">腰</option>
            <option value="肩">肩</option>
            <option value="其它">其它（在备注写具体）</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fb-note">备注（选填）</label>
          <textarea id="fb-note" name="note" rows={2} maxLength={400} className="input" placeholder="例如：最后两组加速没顶下来 / 脚踝有点酸但不影响训练" />
        </div>
        <PendingSubmitButton pendingText="保存中…" className="btn w-full bg-emerald-600 py-2.5 text-white hover:bg-emerald-700">提交反馈</PendingSubmitButton>
      </form>

      {recent.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-1.5 text-xs font-medium text-slate-500">我最近的反馈</div>
          <ul className="space-y-1.5">
            {recent.slice(0, 5).map((x) => (
              <li key={x.date} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                <span className="font-medium text-slate-400">{x.date}</span>
                {x.feel ? <span className="rounded-full bg-slate-100 px-2 py-0.5">感受：{feelLabel(x.feel)}</span> : null}
                {x.soreness ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{x.soreness}</span> : null}
                {x.note ? <span className="min-w-0 flex-1 truncate">{x.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 学生自助：按反馈自动调整计划 */}
      <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
        <div className="text-xs font-semibold text-sky-800">🤖 想让计划跟着反馈自动调整？</div>
        {recent.length === 0 ? (
          <p className="mt-1 text-[11px] leading-relaxed text-sky-700/80">
            先在上面提交一次训练反馈，这里就会出现「按反馈自动调整」按钮。
          </p>
        ) : (
          <>
            <p className="mt-1 text-[11px] leading-relaxed text-sky-700/80">
              系统会结合你最近的成绩与训练感受，重新生成一版计划并<b>直接更新</b>（当天即可看到新安排；之后提交了新反馈，可以再次调整）。
            </p>
            <form action={adjustMyPlanFromFeedbackAction} className="mt-2">
              <input type="hidden" name="useLlm" value="1" />
              <PendingSubmitButton pendingText="生成中…" className="btn w-full bg-sky-600 py-2 text-sm text-white hover:bg-sky-700">
                按我的反馈自动调整计划
              </PendingSubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
function NoticeCard() {
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3">
      <div className="text-sm font-semibold text-sky-900">📌 {MUST_READ.title}</div>
      <ul className="mt-1.5 space-y-1">
        {MUST_READ.lines.map((l, i) => (
          <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-sky-800/90">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LockedPanel({ name }: { name: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <Lock className="h-8 w-8" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900">系统已封锁</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
        {name}，因为你已连续 {LOCK_THRESHOLD} 次训练没有打卡，
        系统判定你不认真对待训练，已将你的系统封锁。
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
        如有需要，请联系教练帮你开锁。
      </p>
      <p className="mt-4 text-xs text-slate-400">封锁期间无法查看训练安排；教练解锁后才能继续。</p>
    </div>
  );
}



const LEAVE_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "待教练批准", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "已批准 · 不算缺勤", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "未通过", cls: "bg-slate-100 text-slate-500" },
};

function LeaveCard({ recent }: { recent: { date: string; status: string; reason: string | null }[] }) {
  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-sky-600" />
        <h2 className="font-semibold text-slate-900">请假 / 提前告知教练</h2>
      </div>
      <p className="mb-3 text-xs text-slate-500">当天要请假（受伤、考试、有事）？提前提交，教练批准后那天<b>不算缺勤</b>。</p>
      <form action={studentLeaveAction} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="leave-date">请假日期</label>
            <input id="leave-date" name="date" type="date" required className="input" defaultValue={localDateKey(new Date())} />
          </div>
          <div>
            <label className="label" htmlFor="leave-reason">原因</label>
            <input id="leave-reason" name="reason" maxLength={200} className="input" placeholder="如：学校考试 / 感冒" />
          </div>
        </div>
        <PendingSubmitButton pendingText="提交中…" className="btn w-full bg-sky-600 py-2.5 text-white hover:bg-sky-700">提交请假</PendingSubmitButton>
      </form>

      {recent.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-1.5 text-xs font-medium text-slate-500">我最近请假的记录</div>
          <ul className="space-y-1">
            {recent.slice(0, 5).map((x) => (
              <li key={x.date} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                <span className="font-medium text-slate-400">{x.date}</span>
                <span className={`rounded-full px-2 py-0.5 ${(LEAVE_STATUS_LABEL[x.status] ?? LEAVE_STATUS_LABEL.pending).cls}`}>
                  {(LEAVE_STATUS_LABEL[x.status] ?? LEAVE_STATUS_LABEL.pending).label}
                </span>
                {x.reason && x.reason !== "未填写原因" ? <span className="min-w-0 flex-1 truncate">{x.reason}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}



