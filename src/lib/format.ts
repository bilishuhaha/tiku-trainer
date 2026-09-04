export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (!withTime) return base;
  return `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayInputValue(): string {
  return localDateKey();
}

/** 计算到目标日期的周数（不足一周按一周计）。返回 null 表示未设置。 */
export function weeksUntil(isoDate: string | null | undefined, from = new Date()): number | null {
  if (!isoDate) return null;
  const target = new Date(isoDate + (isoDate.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - from.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.ceil(days / 7));
}

export function calcAge(birthIso: string | null | undefined): number | null {
  if (!birthIso) return null;
  const b = new Date(birthIso);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function round1(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return (Math.round(n * 10) / 10).toString();
}
export function round2(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return (Math.round(n * 100) / 100).toString();
}
