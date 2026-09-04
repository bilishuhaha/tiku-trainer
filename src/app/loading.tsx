export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-emerald-500 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500">加载中…</p>
      </div>
    </div>
  );
}
