import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Plus, ChevronRight, Inbox, UserRoundCheck, Lock, Unlock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listPendingStudents, listStudents, countPlansByCoach } from "@/lib/repo";
import { fmtDate, weeksUntil } from "@/lib/format";
import { OkBanner } from "@/components/error-banner";
import CopyLinkButton from "@/components/copy-link-button";
import PendingSubmitButton from "@/components/pending-submit-button";
import { unlockStudentAction } from "@/lib/actions";

export const metadata: Metadata = { title: "学生管理" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const user = await requireUser();
  const [students, pending, planCounts] = await Promise.all([
    listStudents(user.id),
    listPendingStudents(user.id),
    countPlansByCoach(user.id),
  ]);
  const counts = new Map<string, number>(Object.entries(planCounts));
  const locked = students.filter((s) => Number(s.locked) === 1);

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = process.env.COOKIE_SECURE === "true" ? "https" : "http";
  const enrollUrl = host ? `${proto}://${host}/s/join?c=${user.id}` : "";

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
            <Lock className="h-4 w-4" /> {locked.length} 名学生因连续 3 次未打卡被系统封锁
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
            return (
              <Link key={s.id} href={`/students/${s.id}`} className={`card group flex items-center justify-between gap-3 p-4 transition hover:border-emerald-300 hover:shadow-md ${Number(s.locked) === 1 ? "border-rose-200 bg-rose-50/40" : ""}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{s.gender === "male" ? "男" : "女"}</span>
                    {Number(s.locked) === 1 && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">已封锁</span>}
                    {Number(s.locked) === 0 && Number(s.missedCount) > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">缺勤 {s.missedCount}/3</span>
                    )}
                    {s.trainingYears !== null && s.trainingYears !== undefined && (
                      <span className="text-xs text-slate-400">训龄 {s.trainingYears} 年</span>
                    )}
                    {s.contact && <span className="truncate text-xs text-slate-400">📞 {s.contact}</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    考试：{fmtDate(s.examDate)} · {w !== null ? `${w} 周后` : "未设日期"} · 计划 {counts.get(s.id) ?? 0} 份
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
