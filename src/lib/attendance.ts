// 考勤规则：按“计划训练日”计算连续未打卡次数，连续 3 次未打卡自动封锁，需教练解锁。
import { findActivePlan, listApprovedLeaveDates, listCheckins, type StudentRow } from "./repo";
import { dateKeyAdd, parseWeekdays, weekdayOf, WEEKDAY_LETTERS } from "./student-view";
import { localDateKey } from "./format";

import { LOCK_THRESHOLD, MUST_READ } from "./attendance-shared";
export { LOCK_THRESHOLD, MUST_READ } from "./attendance-shared";

interface PlanLike {
  startDate: string | null;
  createdAt: string;
  attendanceReset?: string | null;
}

/** 纯计算：从计划开始到今天，连续“训练日”未打卡次数（已批准的请假日视同出勤，不计缺勤） */
export function computeMissed(
  plan: PlanLike,
  weekdaysCsv: string | null,
  checkinDates: Set<string>,
  approvedLeaveDates?: Set<string>,
  today: Date = new Date(),
): number {
  const chosen = parseWeekdays(weekdaysCsv);
  if (!chosen.length) return 0;
  const set = new Set(chosen);
  const excused = approvedLeaveDates ?? new Set<string>();
  const startKey = plan.attendanceReset ?? plan.startDate ?? plan.createdAt.slice(0, 10);
  const todayKey = localDateKey(today);
  let streak = 0;
  let cursor = startKey;
  let guard = 0;
  while (cursor <= todayKey && guard < 500) {
    const wd = weekdayOf(new Date(cursor + "T00:00:00"));
    if (set.has(wd)) {
      if (excused.has(cursor) || checkinDates.has(cursor)) streak = 0;
      else streak++;
    }
    cursor = dateKeyAdd(cursor, 1);
    guard++;
  }
  return streak;
}

export interface AttendanceState {
  missed: number;      // 连续未打卡次数
  locked: boolean;     // 是否封锁（含历史锁）
}

/** 读取真实考勤状态（查计划 + 打卡记录） */
export async function evaluateAttendance(student: Pick<StudentRow, "id" | "weekdays" | "locked">): Promise<AttendanceState> {
  const plan = await findActivePlan(student.id);
  if (!plan) return { missed: 0, locked: false };
  const [checkins, approved] = await Promise.all([
    listCheckins(plan.id),
    listApprovedLeaveDates(student.id),
  ]);
  const missed = computeMissed(plan, student.weekdays, new Set(checkins.map((c) => c.date)), new Set(approved));
  const locked = missed >= LOCK_THRESHOLD || Number(student.locked) === 1;
  return { missed, locked };
}

export function warnText(missed: number): string {
  const left = LOCK_THRESHOLD - missed;
  if (missed >= LOCK_THRESHOLD) return "";
  return `你已有 ${missed} 次训练没有打卡，再缺 ${left} 次系统将自动封锁（需要教练解锁）。请认真完成今天的训练并打卡！`;
}



/** 教练端用：最近 maxDays 内“缺勤的训练日”（无打卡且未批准请假），倒序 */
export function listRecentMissedDates(
  plan: PlanLike,
  weekdaysCsv: string | null,
  checkinDates: Set<string>,
  approvedLeaveDates: Set<string>,
  maxDays = 30,
  today: Date = new Date(),
): { date: string; label: string }[] {
  const chosen = parseWeekdays(weekdaysCsv);
  if (!chosen.length) return [];
  const set = new Set(chosen);
  const start = dateKeyAdd(localDateKey(today), -maxDays);
  const todayKey = localDateKey(today);
  const out: { date: string; label: string }[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= todayKey && guard < 500) {
    const wd = weekdayOf(new Date(cursor + "T00:00:00"));
    if (set.has(wd) && !checkinDates.has(cursor) && !approvedLeaveDates.has(cursor)) {
      out.push({ date: cursor, label: "周" + (WEEKDAY_LETTERS[wd - 1] ?? "") });
    }
    cursor = dateKeyAdd(cursor, 1);
    guard++;
  }
  return out.reverse();
}

/** 教练端详情：考勤状态 + 最近缺勤日列表 */
export async function evaluateAttendanceDetail(
  student: Pick<StudentRow, "id" | "weekdays" | "locked">,
): Promise<AttendanceState & { missedDates: { date: string; label: string }[] }> {
  const plan = await findActivePlan(student.id);
  if (!plan) return { missed: 0, locked: false, missedDates: [] };
  const [checkins, approved] = await Promise.all([
    listCheckins(plan.id),
    listApprovedLeaveDates(student.id),
  ]);
  const chk = new Set(checkins.map((c) => c.date));
  const appr = new Set(approved);
  const missed = computeMissed(plan, student.weekdays, chk, appr);
  const locked = missed >= LOCK_THRESHOLD || Number(student.locked) === 1;
  const missedDates = listRecentMissedDates(plan, student.weekdays, chk, appr);
  return { missed, locked, missedDates };
}
