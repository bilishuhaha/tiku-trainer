import Link from "next/link";
import { Users, CalendarClock, AlertTriangle, ClipboardList, ArrowRight, Plus, Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listStudents, countPlansByCoach } from "@/lib/repo";
import { fmtDate, weeksUntil } from "@/lib/format";
import { ConfirmForm } from "@/components/forms";
import ScoreCalculator from "@/components/score-calculator";
import { deleteStudentAction } from "@/lib/actions";

export const metadata = { title: "仪表盘" };

export default async function DashboardPage() {
  const user = await requireUser();
  const students = await listStudents(user.id);

  const now = new Date();
  const withExam = students.filter((s) => s.examDate);
  const soon = withExam.filter((s) => {
    const w = weeksUntil(s.examDate);
    return w !== null && w >= 0 && w <= 8;
  });
  const planCountMap = await countPlansByCoach(user.id);
  const totalPlans = Object.values(planCountMap).reduce((a, c) => a + c, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">教练工作台</h1>
          <p className="text-sm text-slate-500">你好，{user.name}。科学周期化训练，从数据开始。</p>
        </div>
        <Link href="/students/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> 添加学生
        </Link>
      </div>

      {/* 广东术科成绩算分器 */}
      <ScoreCalculator />

      {/* 新生身体评估表入口（第一节课用） */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700">
            <Printer className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">新学生第一节课？先打印《新生身体评估表》</div>
            <div className="truncate text-xs text-slate-500">让学生填写初始数据，回填系统后即可生成个性化计划</div>
          </div>
        </div>
        <Link href="/assessment" className="btn btn-dark shrink-0 text-xs">打印 · 身体评估表</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="学生总数" value={String(students.length)} tone="emerald" />
        <StatCard icon={CalendarClock} label="8 周内考试" value={String(soon.length)} tone="sky" />
        <StatCard icon={ClipboardList} label="已生成计划" value={String(totalPlans)} tone="indigo" />
        <StatCard icon={AlertTriangle} label="待生成计划" value={String(students.filter((s) => (planCountMap[s.id] ?? 0) === 0).length)} tone="amber" />
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">学生列表（按考试日期排序）</h2>
          <Link href="/students" className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
            全部学生 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {students.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3 font-medium">姓名</th>
                  <th className="py-2 pr-3 font-medium">性别</th>
                  <th className="py-2 pr-3 font-medium">考试日期</th>
                  <th className="py-2 pr-3 font-medium">倒计时</th>
                  <th className="py-2 pr-3 font-medium">计划</th>
                  <th className="py-2 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 8).map((s) => {
                  const w = weeksUntil(s.examDate);
                  const near = w !== null && w <= 8;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-slate-900">{s.name}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{s.gender === "male" ? "男" : "女"}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{fmtDate(s.examDate)}</td>
                      <td className="py-2.5 pr-3">
                        {w === null ? <span className="text-slate-400">未设置</span> : near ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">{w} 周</span>
                        ) : (
                          <span className="text-slate-600">{w} 周</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{(planCountMap[s.id] ?? 0)} 份</td>
                      <td className="py-2.5 text-right">
                        <Link href={`/students/${s.id}`} className="text-emerald-600 hover:text-emerald-700">进入 →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>使用建议：</strong>先给每个学生填好“目标考试日期 + 三项目标成绩 + 最近一次成绩”，再点“生成训练计划”，系统会按考试日期倒推周期、按短板定制侧重。
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    sky: "bg-sky-100 text-sky-700",
    indigo: "bg-indigo-100 text-indigo-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center">
      <p className="text-slate-500">还没有学生。先添加第一位体育生，录入成绩后即可生成 AI 训练计划。</p>
      <Link href="/students/new" className="btn btn-primary mt-4">添加第一位学生</Link>
    </div>
  );
}


