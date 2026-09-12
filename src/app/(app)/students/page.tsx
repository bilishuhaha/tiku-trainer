import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus, ChevronRight, Inbox, UserRoundCheck, Lock, Unlock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { findUserById, listDraftStudentIdsByCoach, listPendingStudents, listStudents, countPlansByCoach, listTrainingStatsByCoach } from "@/lib/repo";
import { fmtDate, weeksUntil } from "@/lib/format";
import { OkBanner } from "@/components/error-banner";
import CopyLinkButton from "@/components/copy-link-button";
import PendingSubmitButton from "@/components/pending-submit-button";
import { toggleAutoConfirmAction, toggleAutoEnrollAction, unlockStudentAction } from "@/lib/actions";
import { LOCK_THRESHOLD } from "@/lib/attendance-shared";

export const metadata: Metadata = { title: "学生管理" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const user = await requireUser();
  const [students, pending, planCounts, draftIdsRaw, trainStats] = await Promise.all([
    listStudents(user.id),
    listPendingStudents(user.id),
    countPlansByCoach(user.id),
    listDraftStudentIdsByCoach(user.id),
    listTrainingStatsByCoach(user.id),
  ]);
  const counts = new Map<string, number>(Object.entries(planCounts));
  const locked = students.filter((s) => Number(s.locked) === 1);
  const draftSet = new Set(draftIdsRaw);
  const autoNew = students.filter((s) => Number(s.autoEnrolled) === 1 && Date.now() - new Date(s.createdAt).getTime() < 72 * 3600e3);


  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = process.env.COOKIE_SECURE === "true" ? "https" : "http";
  const enrollUrl = host ? `${proto}://${host}/s/join?c=${user.id}` : "";
  const fullUser = await findUserById(user.id);
  const autoMode = Number(fullUser?.autoEnroll ?? 1) === 1;
  const autoConfirm = Number(fullUser?.autoConfirmPlan ?? 0) === 1;


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">学生管理</h1>
          <p className="text-sm text-slate-500">
            共 {students.length} 名已确认学生
            {pending.length > 0 ? ` · ${pending.length} 位新生待确认` : ""}
            {locked.length > 0 ? ` · ${locked.length} 位已封锁` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton url={enrollUrl} />
          <Link href="/students/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> 添加学生
          </Link>
        </div>
      </div>

      {/* 刚刚自动加入的学生 */}
      {autoNew.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/70 px-4 py-3">
          <div className="text-sm font-semibold text-emerald-800">🆕 {autoNew.length} 位学生刚刚通过“自动报名”加入</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {autoNew.map((s) => (
              <Link key={s.id} href={`/students/${s.id}`} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">{s.name}{draftSet.has(s.id) ? " · 去核对 →" : " · 已定稿 ✓"}</Link>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">{autoNew.some((s) => draftSet.has(s.id)) ? "系统已自动建档并生成访问码与训练计划；带“去核对”的还有草稿计划，点名字进入档案核对/确认。" : "这些自动报名学生的计划已全部定稿，点名字可查看档案。"}</p>
        </div>
      )}

      {/* 报名模式开关 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${autoMode ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
          {autoMode ? "全自动报名：已开启" : "报名模式：需教练确认"}
        </span>
        <form action={toggleAutoEnrollAction}>
          <input type="hidden" name="value" value={autoMode ? "0" : "1"} />
          <PendingSubmitButton pendingText="切换中…" className="btn btn-outline px-3 py-1 text-xs">{autoMode ? "改回：需教练确认" : "开启：全自动"}</PendingSubmitButton>
        </form>
        <span className="min-w-0 flex-1 text-[11px] text-slate-400">全自动 = 学生提交评估表后，系统自动建档+生成访问码+自动生成训练计划，并直接进入学生端。</span>
      </div>

      {/* 自动定稿开关 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${autoConfirm ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
          {autoConfirm ? "自动生成计划：自动定稿（已确认）" : "自动生成计划：保持草稿待我确认"}
        </span>
        <form action={toggleAutoConfirmAction}>
          <input type="hidden" name="value" value={autoConfirm ? "0" : "1"} />
          <PendingSubmitButton pendingText="切换中…" className="btn btn-outline px-3 py-1 text-xs">{autoConfirm ? "改为：保持草稿" : "改为：自动定稿"}</PendingSubmitButton>
        </form>
        <span className="min-w-0 flex-1 text-[11px] text-slate-400">开启后：自动报名生成的计划会直接定稿（学生端显示已确认）；关闭则保持草稿，由你核对后确认。</span>
      </div>

      <OkBanner ok={
        ok === "confirmed"
          ? "已确认入库 ✅ 该学生已进入正式列表；可在其档案里生成访问码发给学生。"
          : ok === "unlocked"
            ? "已解锁 ✅ 该学生已恢复正常，可以登录学生端继续训练。"
            : null
      } />

      {/* 已封锁学生 */}
      {locked.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
            <Lock className="h-4 w-4" /> {locked.length} 名学生因连续 {LOCK_THRESHOLD} 次未打卡被系统封锁
          </div>
          <ul className="mt-2 space-y-1.5">
            {locked.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <Link href={`/students/${s.id}`} className="font-medium text-slate-900 hover:text-emerald-600">{s.name}</Link>
                  <span className="ml-2 text-xs text-rose-600">已封锁 · 请联系/提醒学生，确认后解锁</span>
                </span>
                <form action={unlockStudentAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="back" value="list" />
                  <PendingSubmitButton pendingText="解锁中…" className="btn btn-dark text-xs">
                    <Unlock className="h-3.5 w-3.5" /> 解锁
                  </PendingSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 待确认新生 */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <UserRoundCheck className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              有 {pending.length} 位新生提交了评估表，等你确认
            </div>
            <Link href="/students/pending" className="btn btn-dark shrink-0 text-xs">去确认 →</Link>
          </div>
          <p className="mt-1 text-xs text-amber-700/80">学生通过你发的“新生报名链接”自助填表，成绩已自动归档；确认后即可生成访问码发给他。</p>
        </div>
      )}

      {students.length === 0 && pending.length === 0 ? (
        <div className="card p-10 text-center">
          <Inbox className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-500">还没有学生。可以：</p>
          <div className="mt-2 text-sm text-slate-500">
            ① 点右上角「新生报名链接」，把链接发给想带的学生自助报名；<br />
            ② 或直接点「添加学生」手动录入。
          </div>
          <Link href="/students/new" className="btn btn-primary mt-4">添加学生</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {students.map((s) => {
            const w = weeksUntil(s.examDate);
            const autoFresh = Number(s.autoEnrolled) === 1 && Date.now() - new Date(s.createdAt).getTime() < 72 * 3600e3;
            return (
              <Link key={s.id} href={`/students/${s.id}`} className={`card group flex items-center justify-between gap-3 p-4 transition hover:border-emerald-300 hover:shadow-md ${Number(s.locked) === 1 ? "border-rose-200 bg-rose-50/40" : ""}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{s.gender === "male" ? "男" : "女"}</span>
                    {autoFresh ? <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">🆕 刚刚自动加入</span> : Number(s.autoEnrolled) === 1 ? <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600">自动报名</span> : null}
                    {Number(s.locked) === 1 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">已封锁</span>}
                    {Number(s.locked) === 0 && Number(s.missedCount) > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">缺勤 {s.missedCount}/{LOCK_THRESHOLD}</span>
                    )}
                    {s.trainingYears !== null && s.trainingYears !== undefined && (
                      <span className="text-xs text-slate-400">训龄 {s.trainingYears} 年</span>
                    )}
                    <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-sky-100">
                      {trainStats[s.id]?.daysPerWeek ? `每周 ${trainStats[s.id].daysPerWeek} 练` : "未排计划"}
                    </span>
                    {s.contact && <span className="truncate text-xs text-slate-400">📞 {s.contact}</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    考试：{fmtDate(s.examDate)} · {w !== null ? `${w} 周后` : "未设日期"} · 计划 {counts.get(s.id) ?? 0} 份 · 已打卡 {trainStats[s.id]?.checkedDays ?? 0} 天
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-emerald-500" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


