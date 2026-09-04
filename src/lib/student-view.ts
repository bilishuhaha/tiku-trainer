import type { DayDoc, PeriodDoc, PhaseKey, PlanDoc } from "./domain/types";
import { localDateKey } from "./format";

export const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export const WEEKDAY_LETTERS = ["一", "二", "三", "四", "五", "六", "日"];

/** 返回今天是周几（周一=1 … 周日=7） */
export function weekdayOf(d: Date = new Date()): number {
  const wd = d.getDay(); // 0=周日
  return wd === 0 ? 7 : wd;
}

/** 周次索引（0 起） */
export function planWeekIndex(startKey: string | null, createdAt: string, today: Date = new Date()): number {
  const start = startKey ?? createdAt.slice(0, 10);
  const s = new Date(start + "T00:00:00");
  const t0 = new Date(localDateKey(today) + "T00:00:00");
  const diff = Math.floor((t0.getTime() - s.getTime()) / 86400000);
  return Math.max(0, Math.floor(diff / 7));
}

export function parseWeekdays(csv: string | null | undefined): number[] {
  if (!csv) return [];
  return csv.split(",").map((x) => Number(x)).filter((n) => n >= 1 && n <= 7);
}

export function defaultWeekdays(k: number): number[] {
  const map: Record<number, number[]> = {
    4: [1, 2, 4, 6],
    5: [1, 2, 3, 5, 6],
    6: [1, 2, 3, 4, 5, 6],
  };
  return map[k] ?? [1, 2, 3, 4, 5, 6].slice(0, k);
}

export function toWeekdayCsv(list: number[]): string {
  return [...list].sort((a, b) => a - b).join(",");
}

/** 本周一日期 */
export function weekStartKey(today: Date = new Date()): string {
  const d = new Date(today);
  const diff = weekdayOf(today) - 1;
  d.setDate(d.getDate() - diff);
  return localDateKey(d);
}

export function dateKeyAdd(key: string, add: number): string {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + add);
  return localDateKey(d);
}

export interface WeekEntry {
  dateKey: string;
  weekday: number; // 1..7
  label: string;   // 周一…
  isRest: boolean;
  dayIndex: number | null; // 1..k
  day: DayDoc | null;
}

export function buildWeek(
  period: PeriodDoc,
  chosenWeekdays: number[],
  today: Date = new Date()
): WeekEntry[] {
  const start = weekStartKey(today);
  const sorted = [...chosenWeekdays].sort((a, b) => a - b);
  const pos = new Map<number, number>();
  sorted.forEach((wd, i) => pos.set(wd, i));
  const entries: WeekEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const dateKey = dateKeyAdd(start, i);
    const wd = i + 1;
    const p = pos.get(wd);
    const has = p !== undefined && period.weeklySchedule[p] !== undefined;
    entries.push({
      dateKey,
      weekday: wd,
      label: WEEKDAY_LABELS[i],
      isRest: !has,
      dayIndex: has ? p + 1 : null,
      day: has ? period.weeklySchedule[p] : null,
    });
  }
  return entries;
}

export function currentPhase(doc: PlanDoc, weekIndex: number): { phaseKey: PhaseKey; period: PeriodDoc; weekNumber: number; totalWeeks: number } {
  const total = doc.calendar.length;
  const idx = Math.min(Math.max(weekIndex, 0), total - 1);
  const cal = doc.calendar[idx];
  const period = doc.periods.find((p) => p.key === cal.phaseKey) ?? doc.periods[0];
  return { phaseKey: cal.phaseKey, period, weekNumber: cal.week, totalWeeks: total };
}
