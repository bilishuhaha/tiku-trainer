import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { loginAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";

export const metadata: Metadata = { title: "登录" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; email?: string }> }) {
  const { error, email } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-50 to-sky-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">体育高考训练助手</h1>
          <p className="mt-1 text-sm text-slate-500">100米 · 立定三级跳远 · 原地推铅球 | AI 周期化训练计划</p>
        </div>
        <div className="card p-6">
          <ErrorBanner error={error} />
          <form action={loginAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">邮箱</label>
              <input id="email" name="email" type="email" required autoComplete="email" defaultValue={email ?? ""} className="input" placeholder="coach@example.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">密码</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary w-full">登录</button>
            <p className="text-xs text-slate-400">默认账号见项目 README（首次使用请尽快修改）。</p>
            <p className="text-center text-xs text-slate-400">学生自己练？<a href="/s/login" className="text-slate-600 underline">前往学生入口 →</a></p>
          </form>
        </div>
      </div>
    </main>
  );
}
