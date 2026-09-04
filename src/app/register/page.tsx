import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, ArrowLeft } from "lucide-react";
import { registerAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";

export const metadata: Metadata = { title: "教练注册" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const needInvite = !!(process.env.INVITE_CODE || "").trim();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-emerald-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">创建教练账号</h1>
          <p className="mt-1 text-sm text-slate-500">注册后即可管理自己的学生与训练计划，数据相互隔离</p>
        </div>
        <div className="card p-6">
          <ErrorBanner error={error} />
          <form action={registerAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">姓名 / 称呼</label>
              <input id="name" name="name" required maxLength={20} className="input" placeholder="如：张教练" />
            </div>
            <div>
              <label className="label" htmlFor="email">邮箱（登录账号）</label>
              <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="coach@example.com" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="password">密码（至少 6 位）</label>
                <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input" placeholder="••••••" />
              </div>
              <div>
                <label className="label" htmlFor="confirm">确认密码</label>
                <input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" className="input" placeholder="••••••" />
              </div>
            </div>
            {needInvite && (
              <div>
                <label className="label" htmlFor="invite">邀请码（由管理员提供）</label>
                <input id="invite" name="invite" required className="input" placeholder="请输入邀请码" />
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full">注册并登录</button>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">
              <ArrowLeft className="h-3.5 w-3.5" /> 已有账号？返回登录
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
