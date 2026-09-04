import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listStudents, countPlansByCoach } from "@/lib/repo";
import { fmtDate, weeksUntil } from "@/lib/format";

export const metadata = { title: "学生管理" };

export default async function StudentsPage() {
  const user = await requireUser();
  const students = await listStudents(user.id);
  const planCounts = await countPlansByCoach(user.id);
  const counts = new Map<string, number>(Object.entries(planCounts));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">学生管理</h1>
          <p className="text-sm text-slate-500">共 {students.length} 名体育生</p>
        </div>
        <Link href="/students/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> 添加学生
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500">还没有学生。添加后即可录入成绩、生成个性化训练计划。</p>
          <Link href="/students/new" className="btn btn-primary mt-4">添加学生</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {students.map((s) => {
            const w = weeksUntil(s.examDate);
            return (
              <Link key={s.id} href={`/students/${s.id}`} className="card group flex items-center justify-between gap-3 p-4 transition hover:border-emerald-300 hover:shadow-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{s.gender === "male" ? "男" : "女"}</span>
                    {s.trainingYears !== null && s.trainingYears !== undefined && (
                      <span className="text-xs text-slate-400">训龄 {s.trainingYears} 年</span>
                    )}
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
