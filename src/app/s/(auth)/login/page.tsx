import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { studentLoginAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";

export const metadata: Metadata = { title: "学生登录" };

export default async function StudentLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">学生训练</h1>
          <p className="mt-1 text-sm text-slate-500">输入教练给你的访问码，查看今天的训练</p>
        </div>
        <div className="card p-6">
          <ErrorBanner error={error} />
          <form action={studentLoginAction} className="space-y-4">
            <div>
              <label className="label" htmlFor="code">访问码</label>
              <input
                id="code"
                name="code"
                required
                autoFocus
                autoComplete="off"
                className="input text-center text-lg font-bold uppercase tracking-[0.3em]"
                placeholder="XXXXXX"
                maxLength={8}
              />
            </div>
            <button type="submit" className="btn btn-dark w-full text-base">进入我的训练</button>
          </form>
          <div className="mt-4 text-center text-xs text-slate-400">
            还没有访问码？请找教练开通（教练在“学生档案 → 学生个人版”生成）。
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          <Link href="/login" className="text-slate-500 hover:text-slate-700">教练入口 →</Link>
        </p>
      </div>
    </main>
  );
}
