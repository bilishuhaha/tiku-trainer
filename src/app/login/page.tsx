import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Target, CalendarRange, Smartphone, FileText, ShieldCheck, Info, ArrowRight, Mail, LockKeyhole, Sparkles, Gauge } from "lucide-react";
import { loginAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";

export const metadata: Metadata = { title: "登录" };

const FEATURES = [
  { icon: CalendarRange, title: "按考试倒推周期", desc: "基础 → 强化 → 专项 → 赛前调整，自动定位你练到第几周" },
  { icon: Gauge, title: "弱项诊断", desc: "30m/60m 拆分、三级跳比例、铅球用力链，先找短板再开练" },
  { icon: Smartphone, title: "学生个人版", desc: "访问码登录，学生每天照着练并打卡，没人盯也能坚持" },
  { icon: FileText, title: "计划一键打印", desc: "确认后导出 PDF，直接发给学生家长或贴在训练场" },
];

const NOTES = [
  "本系统生成的是通用周期化训练建议，需教练结合学生实际与专业判断后执行。",
  "大重量、跳跃与冲刺训练务必现场把关；出现疼痛请立即停止，伤病情况遵医嘱。",
  "各省体育高考评分标准不同，目标成绩请按本省考试院当年标准填写。",
  "系统为训练辅助工具，不构成医学或康复建议；数据请妥善保管并注意账号安全。",
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const { error, email } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 sm:py-12">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="bg-track-lines absolute inset-0 opacity-20" />
        <div className="animate-drift absolute -left-24 -top-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="animate-drift-slow absolute -bottom-24 -right-16 h-[28rem] w-[28rem] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="animate-drift absolute left-1/2 top-1/4 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] backdrop-blur-2xl lg:grid-cols-[1.12fr_1fr]">
        {/* ===== 左：品牌与功能介绍 ===== */}
        <section className="hidden flex-col justify-between p-10 lg:flex xl:p-12">
          <div className="fade-up flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300/80">Tiku Trainer</div>
              <div className="text-sm font-bold text-white">体育高考训练助手</div>
            </div>
          </div>

          <div className="my-8">
            <div className="fade-up fade-up-1 text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
              体育高考 · AI 周期化训练
            </div>
            <h1 className="fade-up fade-up-2 mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-[42px]">
              让每个体育生
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                都知道今天该练什么
              </span>
            </h1>
            <p className="fade-up fade-up-3 mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              覆盖 100 米、立定三级跳远、原地推铅球三项术科。录入成绩与目标，系统按考试日期倒推周期、诊断短板、生成逐日课表。
            </p>

            <div className="fade-up fade-up-4 mt-8 grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 transition hover:border-emerald-400/30 hover:bg-white/[0.08]">
                  <f.icon className="h-5 w-5 text-emerald-300" />
                  <div className="mt-2 text-sm font-semibold text-white">{f.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {["100 米", "立定三级跳远", "原地推铅球", "基础 · 强化 · 专项 · 赛前"].map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ===== 右：登录表单 ===== */}
        <section className="bg-white p-6 sm:p-9 xl:p-11">
          {/* 移动端品牌（小屏） */}
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200">
              <Dumbbell className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">体育高考训练助手</h1>
            <p className="mt-1 text-center text-xs text-slate-400">100米 · 立定三级跳远 · 原地推铅球 | AI 周期化训练</p>
          </div>

          <div className="lg:pt-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">教练登录</h2>
            <p className="mt-1 text-sm text-slate-500">欢迎回来，继续安排今天的训练</p>
          </div>

          <div className="mt-6">
            <ErrorBanner error={error} />
          </div>

          <form action={loginAction} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">邮箱</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={email ?? ""}
                  className="input pl-10"
                  placeholder="coach@example.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">密码</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500"
            >
              登 录
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-700">还没有账号？教练注册 →</Link>
            <Link href="/s/login" className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700">
              学生入口 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">演示默认账号见项目 README · 首次登录后请在“设置”中修改密码</p>

          {/* 注意事项 */}
          <div className="mt-7 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <Info className="h-3.5 w-3.5" /> 使用前请阅读
            </div>
            <ul className="mt-2 space-y-1.5">
              {NOTES.map((n, i) => (
                <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-amber-900/80">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            训练科学引擎 + 可选 AI 润色 · 本地数据存储
          </div>
        </section>
      </div>

      <p className="absolute bottom-4 left-0 right-0 z-10 text-center text-[11px] text-slate-500">
        体育高考训练助手 · 让计划科学可执行，让训练每天有据可依
      </p>
    </main>
  );
}
