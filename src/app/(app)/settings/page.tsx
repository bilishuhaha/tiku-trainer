import type { Metadata } from "next";
import { UserCog, KeyRound, AtSign } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { changePasswordAction, updateProfileAction } from "@/lib/actions";
import { ErrorBanner, OkBanner } from "@/components/error-banner";

export const metadata: Metadata = { title: "账号设置" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">账号设置</h1>
        <p className="text-sm text-slate-500">管理你的登录昵称与密码</p>
      </div>

      <ErrorBanner error={error} />
      <OkBanner
        ok={ok === "profile" ? "昵称已更新 ✓" : ok === "password" ? "密码已修改，下次登录请使用新密码 ✓" : null}
      />

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <AtSign className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">登录账号</h2>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          邮箱：<span className="font-medium text-slate-900">{user.email}</span>
          <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">教练</span>
          <p className="mt-1 text-xs text-slate-400">邮箱作为登录账号，暂不支持修改</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <UserCog className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-900">修改昵称</h2>
        </div>
        <form action={updateProfileAction}>
          <input name="name" required maxLength={20} defaultValue={user.name} className="input" />
          <button type="submit" className="btn btn-primary mt-3">保存昵称</button>
        </form>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-900">修改密码</h2>
        </div>
        <form action={changePasswordAction} className="space-y-3">
          <div>
            <label className="label">当前密码</label>
            <input name="current" type="password" required autoComplete="current-password" className="input" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">新密码（至少 6 位）</label>
              <input name="next" type="password" required minLength={6} autoComplete="new-password" className="input" />
            </div>
            <div>
              <label className="label">确认新密码</label>
              <input name="confirm" type="password" required minLength={6} autoComplete="new-password" className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-dark">更新密码</button>
        </form>
      </div>
    </div>
  );
}
