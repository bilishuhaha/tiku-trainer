import Link from "next/link";
import { Dumbbell, LayoutDashboard, Users, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = [
    { href: "/", label: "仪表盘", icon: LayoutDashboard },
    { href: "/students", label: "学生管理", icon: Users },
  ];
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Dumbbell className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-sm font-bold text-slate-900">体育高考训练助手</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                <n.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
            <span className="mx-1 hidden text-slate-300 sm:inline">|</span>
            <span className="hidden px-1 text-slate-500 sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-rose-600" title="退出登录">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">退出</span>
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
