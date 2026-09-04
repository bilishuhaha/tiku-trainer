import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { studentLogoutAction } from "@/lib/actions";

export default async function StudentHomeLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStudent();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/s" className="text-sm font-bold text-slate-900">🏃 我的训练</Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{me.name}</span>
            <form action={studentLogoutAction}>
              <button type="submit" className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-rose-600" title="退出">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
    </div>
  );
}
