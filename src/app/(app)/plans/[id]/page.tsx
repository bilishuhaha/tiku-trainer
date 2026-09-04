import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Trash2, Lightbulb, ShieldAlert, RotateCcw, ClipboardCheck, FlaskConical, MessageSquarePlus, RefreshCw, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { findPlan, findStudent, updatePlan } from "@/lib/repo";
import { ConfirmForm, PrintButton } from "@/components/forms";
import PendingSubmitButton from "@/components/pending-submit-button";
import { ErrorBanner, OkBanner } from "@/components/error-banner";
import { confirmPlanAction, deletePlanAction, regeneratePlanAction, updatePlanNoteAction } from "@/lib/actions";
import { fmtDate } from "@/lib/format";
import type { PlanDoc, PeriodDoc, DayDoc, BlockDoc, ExerciseDoc, Finding } from "@/lib/domain/types";

export const metadata = { title: "训练计划" };

const PHASE_COLORS: Record<string, string> = {
  base: "bg-sky-100 text-sky-700",
  build: "bg-emerald-100 text-emerald-700",
  specific: "bg-indigo-100 text-indigo-700",
  taper: "bg-amber-100 text-amber-700",
};

export default async function PlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const user = await requireUser();
  const plan = await findPlan(id, user.id);
  if (!plan) notFound();
  const student = await findStudent(plan.studentId, user.id);
  const doc: PlanDoc = JSON.parse(plan.structure);
  const diagnosis: { summaryLines: string[]; findings: Finding[] } = plan.diagnosis ? JSON.parse(plan.diagnosis) : doc.diagnosis;
  const aiMeta = plan.aiMeta ? JSON.parse(plan.aiMeta) : null;
  const hasLlm = !!process.env.OPENAI_API_KEY;

  return (
    <div className="space-y-5">
      <ErrorBanner error={error} />
      <OkBanner ok={ok === "updated" ? "已按学生最新状态更新计划（已回到草稿），请核对后重新确认。" : null} />
      {/* 工具条 */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={student ? `/students/${student.id}` : "/students"} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> {student ? `返回 ${student.name} 档案` : "返回学生列表"}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          {plan.status === "draft" ? (
            <form action={confirmPlanAction}>
            <input type="hidden" name="id" value={id} />
            <PendingSubmitButton className="btn btn-dark" pendingText="确认中…">确认计划（定稿）</PendingSubmitButton>
          </form>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> 已确认
            </span>
          )}
          <ConfirmForm action={deletePlanAction} message="删除这份训练计划？">
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="btn btn-ghost text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /> 删除</button>
          </ConfirmForm>
        </div>
      </div>

      {/* 标题 */}
      <div className="card print-plain p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{doc.meta.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              生成于 {fmtDate(doc.meta.generatedAt, true)} · 每周 {doc.meta.daysPerWeek} 练
              {doc.meta.weeksToExam !== null ? ` · 距考试约 ${doc.meta.weeksToExam} 周` : " · 未设考试日期（默认 12 周）"}
              {doc.meta.examDate ? ` · 考试日 ${doc.meta.examDate}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ModeBadge mode={doc.meta.mode} />
            <StatusBadge status={plan.status} />
          </div>
        </div>

        {/* 教练备注 */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <MessageSquarePlus className="h-4 w-4" /> 教练备注（可编辑，作为本计划的执行说明）
          </div>
          <form action={updatePlanNoteAction}>
            <input type="hidden" name="id" value={id} />
            <textarea name="coachNote" rows={3} defaultValue={plan.coachNote ?? ""} className="input" placeholder="如：周三力量课与文化课冲突，改到周日补；该生踝关节旧伤，跳跃组数减半…" />
            <button type="submit" className="btn btn-outline mt-2">保存备注</button>
          </form>
        </div>
      </div>

      {/* 更新计划（按学生最新状态） */}
      <div className="card border-emerald-200 p-5">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-900">更新计划内容（计划不是一成不变的）</h2>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          学生会变化：新成绩、伤病、疲劳、考试日期调整……点下方按钮会<strong className="text-slate-700">重新诊断并按最新数据重排周期课表</strong>，覆盖当前内容并回到草稿。
        </p>
        <form action={regeneratePlanAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="planId" value={id} />
          <div className="min-w-56 flex-1">
            <input
              name="statusNote"
              className="input"
              placeholder="最近状态（可选）：如 上周踝部不适已恢复 / 最近只练了 4 天 / 100米刚测到 12.3"
            />
          </div>
          {hasLlm && (
            <label className="flex cursor-pointer items-center gap-1.5 pb-1 text-xs text-slate-500">
              <input type="checkbox" name="useLlm" value="1" className="accent-emerald-600" />
              <Sparkles className="h-3.5 w-3.5" /> AI 润色
            </label>
          )}
          <PendingSubmitButton className="btn btn-dark" pendingText="重新生成中，约需 10-60 秒…">
            <RefreshCw className="h-4 w-4" /> 按最新状态重新生成
          </PendingSubmitButton>
        </form>
      </div>

      {/* 执行要点 */}
      <div className="card print-plain p-6">
        <SectionTitle icon={Lightbulb} title="教练执行要点" />
        <ul className="mt-3 space-y-2">
          {doc.meta.coachAdvice.map((a, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 诊断 */}
      {diagnosis.findings.length > 0 && (
        <div className="card print-plain p-6">
          <SectionTitle icon={FlaskConical} title="当前诊断（生成依据）" />
          <div className="mt-3 space-y-2">
            {diagnosis.findings.map((x, i) => (
              <div key={i} className={`rounded-lg border p-3 text-sm ${sevBorder(x.severity)}`}>
                <div className="flex items-start gap-2">
                  <SeverityDot severity={x.severity} />
                  <div>
                    <div className="font-medium text-slate-900">{x.title}</div>
                    {x.detail && <div className="mt-0.5 text-slate-500">{x.detail}</div>}
                    {x.advice && <div className="mt-1 text-slate-600">建议：{x.advice}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 阶段总览 */}
      <div className="card print-plain p-6">
        <SectionTitle icon={ClipboardCheck} title="周期总览（按考试倒推）" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {doc.periods.map((p) => {
            const start = doc.calendar.find((c) => c.phaseKey === p.key)?.week ?? 1;
            return (
              <div key={p.key} className="rounded-xl border border-slate-200 p-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_COLORS[p.key]}`}>{p.name}</span>
                <div className="mt-2 text-2xl font-bold text-slate-900">{p.weeks}<span className="text-sm font-normal text-slate-400"> 周</span></div>
                <div className="text-xs text-slate-400">第 {start} 周起</div>
              </div>
            );
          })}
        </div>
        {doc.meta.basis.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-600">训练科学依据（点击展开）</summary>
            <ul className="mt-2 space-y-1.5 pl-4">
              {doc.meta.basis.map((b, i) => (
                <li key={i} className="list-disc text-xs text-slate-500">{b}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* 各阶段课表 */}
      {doc.periods.map((p, idx) => (
        <PeriodView key={p.key} period={p} index={idx} />
      ))}

      {/* 复测与安全 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card print-plain p-6">
          <SectionTitle icon={RotateCcw} title="复测与调整节点" />
          <ul className="mt-3 space-y-1.5">
            {doc.reassessment.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card print-plain p-6">
          <SectionTitle icon={ShieldAlert} title="安全与恢复提醒" />
          <ul className="mt-3 space-y-1.5">
            {doc.safety.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="no-print pb-8 pt-2 text-center text-xs text-slate-400">
        点击右上角“打印 / 导出 PDF”可保存为纸质或 PDF 版本发给学生。
      </div>
    </div>
  );
}

function PeriodView({ period, index }: { period: PeriodDoc; index: number }) {
  return (
    <div className={`card print-plain p-6 ${index > 0 ? "print-break" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${PHASE_COLORS[period.key]}`}>{period.name}</span>
          <span className="text-sm text-slate-400">{period.weeks} 周 · 每周 {period.weeklySchedule.length} 练</span>
        </div>
        <span className="text-xs text-slate-400">阶段 {index + 1}</span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{period.goal}</p>
      <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
        <strong>阶段推进：</strong>{period.progression}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {period.weeklySchedule.map((d) => (
          <DayView key={d.day} day={d} />
        ))}
      </div>
    </div>
  );
}

function DayView({ day }: { day: DayDoc }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">D{day.day}</span>
          <span className="font-semibold text-slate-900">{day.title}</span>
        </div>
        <span className="text-xs text-slate-400">约 {day.durationMin} 分钟</span>
      </div>
      <div className="mt-3 space-y-3">
        {day.blocks.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
      </div>
      {day.techNotes.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-2">
          {day.techNotes.map((t, i) => (
            <p key={i} className="text-xs text-slate-500">💡 {t}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockView({ block }: { block: BlockDoc }) {
  return (
    <div>
      <div className={`mb-1.5 inline-block rounded px-2 py-0.5 text-xs font-medium ${blockKindColor(block.kind)}`}>{block.label}</div>
      <div className="space-y-1">
        {block.items.map((it, i) => (
          <ExerciseRow key={i} item={it} />
        ))}
      </div>
    </div>
  );
}

function ExerciseRow({ item }: { item: ExerciseDoc }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm font-medium text-slate-800">{item.name}</span>
        <span className="text-sm tabular-nums text-slate-600">{item.dose}</span>
      </div>
      {(item.intensity || item.rest) && (
        <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-slate-400">
          {item.intensity && <span>强度：{item.intensity}</span>}
          {item.rest && <span>间歇：{item.rest}</span>}
        </div>
      )}
      {item.cue && <div className="mt-0.5 text-xs text-slate-500">要点：{item.cue}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Lightbulb; title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-semibold text-slate-900">
      <Icon className="h-5 w-5 text-emerald-600" /> {title}
    </h2>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  if (mode === "llm") return <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">AI 润色版</span>;
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">训练科学引擎</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">已确认</span>;
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">草稿</span>;
}

function sevBorder(sev: string): string {
  if (sev === "high") return "border-rose-200 bg-rose-50/60";
  if (sev === "medium") return "border-amber-200 bg-amber-50/60";
  return "border-slate-200 bg-slate-50";
}

function SeverityDot({ severity }: { severity: string }) {
  const cls = severity === "high" ? "bg-rose-500" : severity === "medium" ? "bg-amber-500" : "bg-slate-400";
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function blockKindColor(kind: string): string {
  const m: Record<string, string> = {
    warmup: "bg-orange-100 text-orange-700",
    main: "bg-emerald-100 text-emerald-700",
    aux: "bg-sky-100 text-sky-700",
    core: "bg-violet-100 text-violet-700",
    cooldown: "bg-slate-200 text-slate-600",
    test: "bg-indigo-100 text-indigo-700",
  };
  return m[kind] ?? "bg-slate-100 text-slate-600";
}


