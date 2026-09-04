import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Target, ClipboardList, Activity, FileText, Sparkles, CalendarClock, Smartphone, KeyRound, XCircle } from "lucide-react";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { findStudent, listGoals, listScores, latestScoresByItem, listPlans } from "@/lib/repo";
import { ConfirmForm } from "@/components/forms";
import { ErrorBanner } from "@/components/error-banner";
import { clearAccessCodeAction, deleteScoreAction, deleteStudentAction, generateAccessCodeAction, generatePlanAction, setGoalAction, addScoreAction } from "@/lib/actions";
import { EVENTS, EVENT_ORDER, ITEMS, itemLabel, itemUnit, isLowerBetter } from "@/lib/domain/items";
import { calcAge, fmtDate, todayInputValue, weeksUntil, round1, round2 } from "@/lib/format";

export const metadata = { title: "学生档案" };

export default async function StudentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const user = await requireUser();
  const student = await findStudent(id, user.id);
  if (!student) notFound();

  const goals = await listGoals(id);
  const goalMap: Record<string, number | null> = {};
  for (const g of goals) goalMap[g.event] = g.target;
  const scores = await listScores(id);
  const latest = await latestScoresByItem(id);
  const plans = await listPlans(id);
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
            <button type="submit" className="btn btn-ghost text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> 删除
            </button>
          </ConfirmForm>
        </div>
      </div>

      <ErrorBanner error={error} />
      {ok === "saved" && <OkNote text="已保存 ✓" />}
      {ok === "access" && <OkNote text="访问码已生成：请把访问码和下面的学生入口发给该学生。" />}
      {ok === "access-off" && <OkNote text="已关闭该学生的个人版访问。" />}

      {student.injuryNote && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <strong>伤病/注意事项：</strong>{student.injuryNote}
        </div>
      )}

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
                <button type="submit" className="btn btn-outline text-xs"><KeyRound className="h-3.5 w-3.5" /> 重置访问码</button>
              </form>
              <form action={clearAccessCodeAction}>
                <input type="hidden" name="studentId" value={id} />
                <button type="submit" className="btn btn-ghost text-xs text-rose-600 hover:bg-rose-50"><XCircle className="h-3.5 w-3.5" /> 关闭学生访问</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4">
            <p className="text-sm text-slate-500">适合“没人盯着练”的学生：给他一个访问码，他自己登录就能看到每天练什么、做完打卡。</p>
            <form action={generateAccessCodeAction} className="mt-3">
              <input type="hidden" name="studentId" value={id} />
              <button type="submit" className="btn btn-primary text-xs"><KeyRound className="h-3.5 w-3.5" /> 生成访问码，开通学生个人版</button>
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
                    <button type="submit" className="btn btn-outline text-xs">保存目标</button>
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
            <button type="submit" className="btn btn-primary">添加记录</button>
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
            <button type="submit" className="btn btn-primary">生成训练计划</button>
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
                        <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">删除</button>
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
