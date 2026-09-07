import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Inbox, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listPendingStudents } from "@/lib/repo";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "待确认新生" };

export default async function PendingStudentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await requireUser();
  const pending = await listPendingStudents(user.id);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/students" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 返回学生管理
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">待确认新生（{pending.length}）</h1>
        <p className="text-sm text-slate-500">学生通过“新生报名链接”填写的评估表会自动落在这里，成绩已按项目归档，确认前不会出现在正式学生列表。</p>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {pending.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Inbox className="h-6 w-6" /></div>
          <p className="font-medium text-slate-700">还没有待确认的新生</p>
          <p className="mt-1 text-sm text-slate-400">把“新生报名链接”发给学生，他们填写后会出现在这里。</p>
          <Link href="/students" className="btn btn-outline mt-5 text-sm">返回学生管理</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((s) => (
            <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">{s.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{s.gender === "male" ? "男" : "女"}</span>
                  {s.contact && <span className="text-xs text-slate-500">📞 {s.contact}</span>}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  提交于 {fmtDate(s.createdAt, true)}
                  {s.examDate ? ` · 考试 ${fmtDate(s.examDate)}` : ""}
                  {s.height ? ` · ${s.height}cm` : ""}
                  {s.weight ? ` / ${s.weight}kg` : ""}
                </div>
              </div>
              <Link href={`/students/pending/${s.id}`} className="btn btn-dark shrink-0 text-xs">查看并确认 →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
