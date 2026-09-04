import { AlertCircle } from "lucide-react";

export function ErrorBanner({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );
}

export function OkBanner({ ok }: { ok?: string | null }) {
  if (!ok) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      <span>{ok}</span>
    </div>
  );
}
