// 考勤规则：按“计划训练日”计算连续未打卡次数，连续 3 次未打卡自动封锁，需教练解锁。
import { findActivePlan, listApprovedLeaveDates, listCheckins, type StudentRow } from "./repo";
import { dateKeyAdd, parseWeekdays, weekdayOf } from "./student-view";
import { localDateKey } from "./format";

import { LOCK_THRESHOLD, MUST_READ } from "./attendance-shared";
export { LOCK_THRESHOLD, MUST_READ } from "./attendance-shared";

interface PlanLike {
  startDate: string | null;
  createdAt: string;
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
  const startKey = plan.startDate ?? plan.createdAt.slice(0, 10);
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


