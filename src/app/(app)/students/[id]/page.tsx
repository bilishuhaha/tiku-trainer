import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Target, ClipboardList, Activity, FileText, Sparkles, CalendarClock, Smartphone, KeyRound, XCircle, MessageSquare, RefreshCcw, Lock, Unlock } from "lucide-react";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { findStudent, listFeedbackByStudent, listGoals, listLeavesByStudent, listScores, latestScoresByItem, listPlans, syncAttendance } from "@/lib/repo";
import { ConfirmForm } from "@/components/forms";
import PendingSubmitButton from "@/components/pending-submit-button";
import { ErrorBanner } from "@/components/error-banner";
import { adjustPlanFromFeedbackAction, approveLeaveAction, clearAccessCodeAction, coachMarkCheckinAction, deleteScoreAction, deleteStudentAction, generateAccessCodeAction, generatePlanAction, rejectLeaveAction, setGoalAction, addScoreAction, unlockStudentAction } from "@/lib/actions";
import { enableSingleAction, generateSinglePlanAction, setSingleEventAction } from "@/lib/actions";
import { EVENTS, EVENT_ORDER, ITEMS, itemLabel, itemUnit, isLowerBetter } from "@/lib/domain/items";
import { calcAge, fmtDate, todayInputValue, weeksUntil, round1, round2 } from "@/lib/format";
import { evaluateAttendanceDetail } from "@/lib/attendance";
import { LOCK_THRESHOLD } from "@/lib/attendance-shared";

const SINGLE_EV_LABEL: Record<string, string> = {
  sprint: "百米（100 米）单招",
  longJump: "急行跳远（助跑跳远）单招",
  both: "100 米 + 急行跳远（两项都练）",
};
const SINGLE_EV_OPTIONS: { v: string; label: string; hint: string }[] = [
  { v: "sprint", label: "百米", hint: "只安排 100 米专项训练（跳跃作为爆发力辅助）" },
  { v: "longJump", label: "急行跳远", hint: "只安排急行跳远专项（短冲作为助跑速度辅助）" },
  { v: "both", label: "两项都练", hint: "100 米 + 急行跳远同时作为主项" },
];

export const metadata = { title: "学生档案" };

export default async function StudentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const user = await requireUser();
  const student = await findStudent(id, user.id);
  if (!student) notFound();

  // 考勤状态（仅正式学生：实时按最新计划计算并回写，供列表/教练端显示）
  let attLocked = Number(student.locked) === 1;
  let attMissed = Number(student.missedCount);
  let attMissedDates: { date: string; label: string }[] = [];
  if (student.pending !== 1) {
    const att = await evaluateAttendanceDetail(student);
    attMissed = att.missed;
    attLocked = att.locked;
    attMissedDates = att.missedDates;
    if (attMissed !== Number(student.missedCount) || (attLocked ? 1 : 0) !== Number(student.locked)) {
      await syncAttendance(id, attMissed, attLocked ? 1 : 0);
    }
  }

  // 并行查询目标/成绩/计划/反馈/请假，减少跨区网络下点开学生档案的等待
  const [goals, scores, latest, feedback, leaves, plans] = await Promise.all([
    listGoals(id),
    listScores(id),
    latestScoresByItem(id),
    listFeedbackByStudent(id, 20),
    listLeavesByStudent(id, 30),
    listPlans(id),
  ]);
  const goalMap: Record<string, number | null> = {};
  for (const g of goals) goalMap[g.event] = g.target;
  const age = calcAge(student.birthDate);
  const weeks = weeksUntil(student.examDate);
  const hasLlm = !!process.env.OPENAI_API_KEY;
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = process.env.COOKIE_SECURE === "true" ? "https" : "http";
  const portalUrl = host ? `${proto}://${host}/s/login` : "/s/login";

  const primaryScores = EVENT_ORDER.map((ev) => {
    const def = EVENTS[ev];
    const cur = latest[def.primaryItem];
    return { ev, def, cur };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/students" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> 学生列表
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{student.gender === "male" ? "男" : "女"}{age !== null ? ` · ${age} 岁` : ""}</span>
            {student.trainingYears !== null && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">训龄 {student.trainingYears} 年</span>}
            {weeks !== null && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${weeks <= 8 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                距考试约 {weeks} 周
              </span>
            )}
          </div>
          {student.goalNote && <p className="mt-1 text-sm text-slate-500">🎯 {student.goalNote}</p>}
        </div>
        <div className="flex items-center gap-2 no-print">
          <Link href={`/students/${id}/edit`} className="btn btn-outline">
            <Pencil className="h-4 w-4" /> 编辑档案
          </Link>
          <ConfirmForm action={deleteStudentAction} message={`确定删除学生「${student.name}」？其成绩与计划将一并删除，不可恢复。`}>
            <input type="hidden" name="id" value={id} />
            <PendingSubmitButton className="btn btn-ghost text-rose-600 hover:bg-rose-50" pendingText="删除中…">
              <Trash2 className="h-4 w-4" /> 删除
            </PendingSubmitButton>
          </ConfirmForm>
        </div>
      </div>

      <ErrorBanner error={error} />
      {ok === "saved" && <OkNote text="已保存 ✓" />}
      {ok === "access" && <OkNote text="访问码已生成：请把访问码和下面的学生入口发给该学生。" />}
      {ok === "access-off" && <OkNote text="已关闭该学生的个人版访问。" />}
      {ok === "unlocked" && <OkNote text="已解锁 ✅ 该生可正常登录学生端继续训练。" />}
      {ok === "leave-approved" && <OkNote text="已批准请假 ✅ 该日不算缺勤。" />}
      {ok === "leave-rejected" && <OkNote text="已拒绝该请假（仍算训练日，请提醒学生打卡）。" />}
      {ok === "coach-checkin" && <OkNote text="已为该生补打卡，撤销该天缺勤 ✅" />}
      {ok === "single-on" && <OkNote text="已开通单招 ✅ 请在该生档案里选好单招项目（百米 / 急行跳远 / 两项都练）后生成计划。" />}
      {ok === "single-event" && <OkNote text="已保存单招项目 ✅ 若该生已有旧计划，请点上方“按当前项目生成单招计划”重新生成并“确认（定稿）”，学生端才会更新为所选专项内容。" />}
      {ok === "single-off" && <OkNote text="已关闭单招授权。" />}
      {ok === "adjusted" && <OkNote text="已根据学生最新反馈自动更新计划（已回到草稿）。学生端会收到“计划已更新”提示；请到计划页核对后重新确认。" />}

      {student.injuryNote && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <strong>伤病/注意事项：</strong>{student.injuryNote}
        </div>
      )}


      {/* 考勤状态与封锁 */}
      {student.pending !== 1 && (
        <div className={`card p-5 ${attLocked ? "border-rose-200" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {attLocked ? <Lock className="h-5 w-5 text-rose-600" /> : <Activity className="h-5 w-5 text-slate-400" />}
              <h2 className="font-semibold text-slate-900">考勤状态</h2>
            </div>
            {attLocked ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">已封锁</span>
            ) : attMissed > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">缺勤 {attMissed} / {LOCK_THRESHOLD}</span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">正常</span>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
{attLocked ? `该生已连续 ${LOCK_THRESHOLD} 次训练未打卡，系统已自动封锁学生端。解锁后学生可重新查看计划并继续训练。` : attMissed > 0 ? `该生已有 ${attMissed} 次训练未打卡（连续 ${LOCK_THRESHOLD} 次会自动封锁），请留意并提醒。` : `考勤正常。连续 ${LOCK_THRESHOLD} 次训练未打卡会自动封锁学生端，届时你可在这里一键解锁。`}
          </p>
          {attMissedDates.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <div className="text-xs font-medium text-slate-600">最近缺勤的训练日（可帮学生“补打卡”撤销缺勤）</div>
              <ul className="mt-1.5 space-y-1">
                {attMissedDates.slice(0, 6).map((d) => (
                  <li key={d.date} className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{fmtDate(d.date)}（{d.label}）</span>
                    <form action={coachMarkCheckinAction}>
                      <input type="hidden" name="studentId" value={id} />
                      <input type="hidden" name="date" value={d.date} />
                      <PendingSubmitButton pendingText="…" className="btn bg-emerald-600 px-2.5 py-1 text-[11px] text-white hover:bg-emerald-700">补打卡</PendingSubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-slate-400">说明：确认当天学生其实练了，点“补打卡”即可撤销该天缺勤；缺勤低于 {LOCK_THRESHOLD} 次会自动解除封锁。</p>
            </div>
          )}

          {attLocked && (
            <form action={unlockStudentAction} className="mt-3">
              <input type="hidden" name="id" value={id} />
              <PendingSubmitButton pendingText="解锁中…" className="btn btn-dark text-xs">
                <Unlock className="h-3.5 w-3.5" /> 解锁该学生
              </PendingSubmitButton>
            </form>
          )}
        </div>
      )}

      {/* 请假申请 */}
      <LeaveSection leaves={leaves} />


            {/* 单招专项计划（百米 / 急行跳远，可单选或两项都练）——仅教练端，学生端不显示 */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">单招专项计划（百米 / 急行跳远）</h2>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${Number(student.singleEnabled) === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{Number(student.singleEnabled) === 1 ? "已授权" : "未授权"}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">仅教练端可用：学生端看不到、也不能自己生成单招计划。可给该生选<strong>百米</strong>、选<strong>急行跳远</strong>，也可以<strong>两项都练</strong>。</p>
        {Number(student.singleEnabled) === 1 ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <div>
                <div className="text-xs text-slate-500">当前单招项目</div>
                <div className="mt-0.5 text-sm font-semibold text-emerald-700">{SINGLE_EV_LABEL[(student.singleEvent ?? "both")] ?? "两项都练"}</div>
              </div>
              <form action={enableSingleAction}><input type="hidden" name="studentId" value={id} /><input type="hidden" name="value" value="0" /><PendingSubmitButton pendingText="处理中…" className="btn btn-outline px-3 py-1 text-xs">关闭授权</PendingSubmitButton></form>
            </div>

            <form action={setSingleEventAction} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <input type="hidden" name="studentId" value={id} />
              <div className="text-xs font-semibold text-slate-700">单招项目选择（改完点“保存”，下次生成按此）</div>
              <div className="mt-2 grid gap-1.5 text-xs text-slate-600">
                {SINGLE_EV_OPTIONS.map((o) => (
                  <label key={o.v} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <input type="radio" name="singleEvent" value={o.v} defaultChecked={((student.singleEvent ?? "both") as string) === o.v} className="mt-0.5 accent-emerald-600" />
                    <span><span className="font-semibold text-slate-800">{o.label}</span><span className="block text-[11px] text-slate-400">{o.hint}</span></span>
                  </label>
                ))}
              </div>
              <PendingSubmitButton pendingText="保存中…" className="btn btn-outline border-emerald-300 px-3 py-1 text-xs text-emerald-700">保存所选项目</PendingSubmitButton>
            </form>

            <form action={generateSinglePlanAction} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <input type="hidden" name="studentId" value={id} />
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>每周训练：</span>
                {[4,5,6].map((n)=>(<label key={n} className="flex cursor-pointer items-center gap-1"><input type="radio" name="daysPerWeek" value={String(n)} defaultChecked={n===6} className="accent-emerald-600" />{n} 练</label>))}
                {hasLlm && (<label className="flex cursor-pointer items-center gap-1"><input type="checkbox" name="useLlm" value="1" className="accent-emerald-600" /> AI 润色</label>)}
                <PendingSubmitButton pendingText="生成中…" className="btn btn-dark text-xs">按当前项目生成单招计划</PendingSubmitButton>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">按“当前单招项目（{SINGLE_EV_LABEL[(student.singleEvent ?? "both")] ?? "两项都练"}）”生成对应专项计划：参考美国田径协会（USATF）专项训练理论，分项技术模型 + 精细周期分期 + 个人短板诊断 + 测验反馈闭环；支持学生每日打卡反馈并自动调整。改项目请先点上方“保存所选项目”。</p>
            </form>
          </div>
        ) : (
          <form action={enableSingleAction} className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <input type="hidden" name="studentId" value={id} />
            <input type="hidden" name="value" value="1" />
            <div className="text-xs font-semibold text-slate-700">先选择该生的单招项目，再开通：</div>
            <div className="mt-2 grid gap-1.5 text-xs text-slate-600">
              {SINGLE_EV_OPTIONS.map((o) => (
                <label key={o.v} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <input type="radio" name="singleEvent" value={o.v} defaultChecked={(student.singleEvent ?? "both") === o.v} className="mt-0.5 accent-emerald-600" />
                  <span><span className="font-semibold text-slate-800">{o.label}</span><span className="block text-[11px] text-slate-400">{o.hint}</span></span>
                </label>
              ))}
            </div>
            <PendingSubmitButton pendingText="开通中…" className="btn btn-primary mt-3 text-sm">开通单招（按所选项目生成）</PendingSubmitButton>
          </form>
        )}
      </div>

{/* 学生个人版 */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-slate-600" />
            <h2 className="font-semibold text-slate-900">学生个人版（给学生自己练）</h2>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${student.accessCode ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {student.accessCode ? "已开通" : "未开通"}
          </span>
        </div>
        {student.accessCode ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="text-xs text-slate-400">该学生的访问码（请单独发给他）</div>
                <div className="mt-0.5 text-2xl font-bold tracking-[0.25em] text-slate-900">{student.accessCode}</div>
              </div>
              <div className="text-sm text-slate-500">
                学生入口：<a href={portalUrl} target="_blank" className="text-emerald-600 underline">{portalUrl}</a>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">学生登录后只能看到自己的训练计划并打卡，看不到其他数据。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={generateAccessCodeAction}>
                <input type="hidden" name="studentId" value={id} />
                <PendingSubmitButton className="btn btn-outline text-xs" pendingText="生成访问码中…"><KeyRound className="h-3.5 w-3.5" /> 重置访问码</PendingSubmitButton>
              </form>
              <form action={clearAccessCodeAction}>
                <input type="hidden" name="studentId" value={id} />
                <PendingSubmitButton className="btn btn-ghost text-xs text-rose-600 hover:bg-rose-50" pendingText="处理中…"><XCircle className="h-3.5 w-3.5" /> 关闭学生访问</PendingSubmitButton>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4">
            <p className="text-sm text-slate-500">适合“没人盯着练”的学生：给他一个访问码，他自己登录就能看到每天练什么、做完打卡。</p>
            <form action={generateAccessCodeAction} className="mt-3">
              <input type="hidden" name="studentId" value={id} />
              <PendingSubmitButton className="btn btn-primary text-xs" pendingText="生成访问码中…"><KeyRound className="h-3.5 w-3.5" /> 生成访问码，开通学生个人版</PendingSubmitButton>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {primaryScores.map(({ ev, def, cur }) => (
          <PrimaryScoreCard key={ev} ev={ev} defLabel={def.shortLabel} itemKey={def.primaryItem}
            cur={cur?.value ?? null} curDate={cur?.date ?? null} target={goalMap[def.primaryItem] ?? goalMap[ev] ?? null}
            history={scores.filter((s) => s.item === def.primaryItem).slice(-8)} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 目标成绩 */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">目标成绩（按本省体育高考标准填写）</h2>
          </div>
          <div className="space-y-4">
            {EVENT_ORDER.map((ev) => {
              const def = EVENTS[ev];
              return (
                <div key={ev} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{def.label}</span>
                    <span className="text-xs text-slate-400">{def.items.map((i) => itemLabel(i)).join(" / ")}</span>
                  </div>
                  <form action={setGoalAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="studentId" value={id} />
                    <input type="hidden" name="event" value={ev} />
                    <div className="min-w-24 flex-1">
                      <input name="target" type="number" step="0.01" min="0" required defaultValue={goalMap[ev] ?? ""} className="input" placeholder={`目标（${itemUnit(def.primaryItem)}）`} />
                    </div>
                    <div className="min-w-24 flex-1">
                      <input name="goalNote" defaultValue="" placeholder="备注（可选）" className="input" />
                    </div>
                    <PendingSubmitButton className="btn btn-outline text-xs" pendingText="处理中…">保存目标</PendingSubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
          {weeks === null && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
              <CalendarClock className="h-3.5 w-3.5" /> 未设置考试日期：计划将按默认 12 周生成，建议在编辑档案中填写。
            </p>
          )}
        </div>

        {/* 录入成绩 */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">录入测试成绩</h2>
          </div>
          <form action={addScoreAction} className="space-y-3">
            <input type="hidden" name="studentId" value={id} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">测试日期</label>
                <input name="date" type="date" required defaultValue={todayInputValue()} className="input" />
              </div>
              <div>
                <label className="label">测试项目</label>
                <select name="item" required className="input" defaultValue="sprint100">
                  {Object.values(ITEMS).map((it) => (
                    <option key={it.key} value={it.key}>{it.label}（{it.unit}）</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">成绩</label>
                <input name="value" type="number" step="0.01" min="0" required className="input" placeholder="如 12.35" />
              </div>
              <div>
                <label className="label">备注</label>
                <input name="note" className="input" placeholder="手计时/顺风等（可选）" />
              </div>
            </div>
            <PendingSubmitButton className="btn btn-primary" pendingText="处理中…">添加记录</PendingSubmitButton>
          </form>
        </div>
      </div>

      {/* 生成计划 */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-900">生成 AI 周期训练计划</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          依据：最新成绩（弱点诊断）+ 目标成绩 + 考试日期倒推周期。建议已录入三项成绩和目标后生成。
        </p>
        <form action={generatePlanAction}>
          <input type="hidden" name="studentId" value={id} />
          <div className="flex flex-wrap items-end gap-5">
            <div>
              <label className="label">每周训练次数</label>
              <div className="flex gap-2">
                {[4, 5, 6].map((n) => (
                  <label key={n} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="radio" name="daysPerWeek" value={String(n)} defaultChecked={n === 6} className="accent-emerald-600" />
                    {n} 练 / 周
                  </label>
                ))}
              </div>
            </div>
            {hasLlm && (
              <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-slate-600">
                <input type="checkbox" name="useLlm" value="1" defaultChecked className="accent-emerald-600" />
                AI 润色（调用大模型优化执行要点）
              </label>
            )}
            <PendingSubmitButton className="btn btn-primary" pendingText="正在生成计划，约需 10-60 秒…">生成训练计划</PendingSubmitButton>
          </div>
        </form>
        <div className="mt-3 text-xs text-slate-400">
          已配置大模型密钥时可选“AI 润色”；未配置也能由内置训练科学引擎完整生成。
        </div>
      </div>

      {/* 历史成绩表 */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">成绩历史</h2>
        </div>
        {scores.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">暂无成绩记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400">
                  <th className="py-2 pr-3 font-medium">日期</th>
                  <th className="py-2 pr-3 font-medium">项目</th>
                  <th className="py-2 pr-3 font-medium">成绩</th>
                  <th className="py-2 pr-3 font-medium">备注</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...scores].reverse().slice(0, 40).map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-500">{fmtDate(s.date)}</td>
                    <td className="py-2 pr-3 text-slate-700">{itemLabel(s.item)}</td>
                    <td className="py-2 pr-3 font-medium text-slate-900">{isLowerBetter(s.item) ? s.value.toFixed(2) : round2(s.value)} {itemUnit(s.item)}</td>
                    <td className="py-2 pr-3 text-slate-400">{s.note || "—"}</td>
                    <td className="py-2 text-right">
                      <ConfirmForm action={deleteScoreAction} message="删除这条成绩记录？">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="studentId" value={id} />
                        <PendingSubmitButton className="text-xs text-slate-400 hover:text-rose-600" pendingText="删除中…">删除</PendingSubmitButton>
                      </ConfirmForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 计划列表 */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">已生成的计划</h2>
        </div>
        {plans.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">还没有计划，点击上方“生成训练计划”创建第一份。</p>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/plans/${p.id}`} className="font-medium text-slate-900 hover:text-emerald-600">{p.title}</Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">生成于 {fmtDate(p.createdAt, true)}</div>
                </div>
                <Link href={`/plans/${p.id}`} className="btn btn-outline text-xs">查看 / 打印</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 学生训练反馈（自动同步 + 一键按反馈调整计划） */}
      <StudentFeedbackSection feedback={feedback} hasPlan={plans.length > 0} studentId={id} hasLlm={hasLlm} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">已确认</span>;
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">草稿</span>;
}

function PrimaryScoreCard({ ev, defLabel, itemKey, cur, curDate, target, history }: {
  ev: string; defLabel: string; itemKey: string; cur: number | null; curDate: string | null; target: number | null; history: { value: number }[];
}) {
  const lower = isLowerBetter(itemKey);
  const reached = target !== null && cur !== null ? (lower ? cur <= target : cur >= target) : null;
  const gap = target !== null && cur !== null ? Math.abs(cur - target) : null;
  void ev;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{defLabel}</span>
        {target !== null && <span className="text-xs text-slate-400">目标 {round2(target)}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{cur !== null ? (lower ? cur.toFixed(2) : round2(cur)) : "—"}</span>
        {cur !== null && <span className="text-sm text-slate-400">{itemUnit(itemKey)}</span>}
      </div>
      <div className="mt-1 text-xs text-slate-400">{curDate ? fmtDate(curDate) : "暂无成绩"}</div>
      {reached !== null && (
        <div className={`mt-1 text-xs font-medium ${reached ? "text-emerald-600" : "text-amber-600"}`}>
          {reached ? "✓ 已达标" : `距目标还差 ${gap!.toFixed(2)} ${itemUnit(itemKey)}`}
        </div>
      )}
      <Sparkline history={history} lowerBetter={lower} />
    </div>
  );
}

function Sparkline({ history, lowerBetter }: { history: { value: number }[]; lowerBetter: boolean }) {
  if (history.length < 2) return <div className="mt-2 h-10 rounded bg-slate-50" />;
  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 220; const H = 40;
  const pts = values.map((v, i) => {
    const x = history.length === 1 ? 0 : (i / (history.length - 1)) * W;
    const y = H - 4 - ((v - min) / span) * (H - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const color = lowerBetter ? "#0d9488" : "#059669";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-10 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={H - 4 - ((values[values.length - 1] - min) / span) * (H - 8)} r="3" fill={color} />
    </svg>
  );
}

function OkNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{text}</div>
  );
}





const FB_FEEL_LABEL: Record<number, string> = { 1: "很轻松", 2: "正好", 3: "偏累", 4: "很累", 5: "练不动" };

function StudentFeedbackSection({ feedback, hasPlan, studentId, hasLlm }: {
  feedback: { date: string; feel: number | null; soreness: string | null; note: string | null; createdAt: string }[];
  hasPlan: boolean;
  studentId: string;
  hasLlm: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-emerald-600" />
        <h2 className="font-semibold text-slate-900">学生训练反馈（学生端自动同步）</h2>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        学生在“我的训练”里提交后会自动出现在这里，不用你再逐条录入。
      </p>

      {feedback.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">还没有收到反馈——让学生练完在手机学生端填一下即可。</p>
      ) : (
        <ul className="space-y-2">
          {feedback.slice(0, 12).map((x) => (
            <li key={x.date + x.createdAt} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-medium text-slate-500">{fmtDate(x.date)}</span>
                {x.feel ? (
                  <span className={`rounded-full px-2 py-0.5 ${(x.feel ?? 0) >= 4 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    感受 {FB_FEEL_LABEL[x.feel]}
                  </span>
                ) : null}
                {x.soreness && x.soreness !== "无" ? (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">{x.soreness}</span>
                ) : null}
              </div>
              {x.note ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{x.note}</p> : null}
            </li>
          ))}
        </ul>
      )}

      {hasPlan && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <form action={adjustPlanFromFeedbackAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="studentId" value={studentId} />
            <div className="min-w-0 flex-1 text-xs leading-relaxed text-slate-600">
              根据<b>最新成绩 + 上面这些反馈</b>自动重建课表：明显疲劳/不适会提示先恢复减量。
              调整后学生端会收到“计划已更新”提示，计划回到草稿，请核对后重新确认。
            </div>
            {hasLlm && (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" name="useLlm" value="1" className="accent-emerald-600" />
                <Sparkles className="h-3.5 w-3.5" /> AI 润色
              </label>
            )}
            <PendingSubmitButton className="btn btn-dark text-xs" pendingText="自动调整中…">
              <RefreshCcw className="h-3.5 w-3.5" /> 按反馈自动调整计划
            </PendingSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}





function LeaveSection({ leaves }: { leaves: { id: string; date: string; status: string; reason: string | null }[] }) {
  const pending = leaves.filter((x) => x.status === "pending");
  const history = leaves.filter((x) => x.status !== "pending").slice(0, 8);
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-sky-600" />
          <h2 className="font-semibold text-slate-900">请假申请</h2>
        </div>
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">待批准 {pending.length}</span>
      </div>
      <p className="mb-3 mt-1 text-xs text-slate-500">批准后，学生请假当天不算缺勤，不会触发封锁。</p>

      {pending.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">没有待批准的请假</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((x) => (
            <li key={x.id} className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">📅 {fmtDate(x.date)}</div>
                  <div className="text-xs text-slate-500">{x.reason ?? "未填写原因"}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={approveLeaveAction}>
                    <input type="hidden" name="id" value={x.id} />
                    <PendingSubmitButton pendingText="…" className="btn bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700">批准</PendingSubmitButton>
                  </form>
                  <form action={rejectLeaveAction}>
                    <input type="hidden" name="id" value={x.id} />
                    <PendingSubmitButton pendingText="…" className="btn btn-outline px-3 py-1.5 text-xs">拒绝</PendingSubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          <div className="mb-1.5 text-xs font-medium text-slate-400">最近处理记录</div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((x) => (
              <span key={x.id} className={`rounded-full px-2 py-0.5 text-[11px] ${x.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {fmtDate(x.date)} · {x.status === "approved" ? "已批准" : "已拒绝"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

