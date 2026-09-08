// ===== 中国时区（Asia/Shanghai）：站点服务于国内用户，服务器可能在 UTC，日期一律按中国时间 =====
const CN_TZ = "Asia/Shanghai";
function chinaParts(d: Date): { y: number; m: number; day: number; h: number; min: number } {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: CN_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => (p.find((x) => x.type === t)?.value ?? "");
  return { y: Number(get("year")), m: Number(get("month")), day: Number(get("day")), h: Number(get("hour")), min: Number(get("minute")) };
}
const pad2 = (n: number) => String(n).padStart(2, "0");

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = chinaParts(d);
  const base = `${p.y}-${pad2(p.m)}-${pad2(p.day)}`;
  if (!withTime) return base;
  return `${base} ${pad2(p.h)}:${pad2(p.min)}`;
}

export function localDateKey(d: Date = new Date()): string {
  const p = chinaParts(d);
  return `${p.y}-${pad2(p.m)}-${pad2(p.day)}`;
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
  const now = chinaParts(new Date());
  const by = b.getFullYear();
  const bm = b.getMonth() + 1;
  const bd = b.getDate();
  let age = now.y - by;
  if (now.m < bm || (now.m === bm && now.day < bd)) age--;
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
