import { getDb, nowIso } from "./db";
import { randomUUID } from "node:crypto";
import { localDateKey } from "./format";

export interface UserRow { id: string; email: string; passwordHash: string; name: string; role: string; autoEnroll: number; autoConfirmPlan: number; createdAt: string; }
export interface StudentRow {
  id: string; coachId: string; name: string; gender: string;
  birthDate: string | null; height: number | null; weight: number | null;
  trainingYears: number | null; examDate: string | null; goalNote: string | null;
  injuryNote: string | null; note: string | null; accessCode: string | null; weekdays: string | null;
  contact: string | null; pending: number; autoEnrolled: number; singleEnabled: number; singleEvent: string | null; missedCount: number; locked: number;
  createdAt: string; updatedAt: string;
}
export interface GoalRow { id: string; studentId: string; event: string; target: number; note: string | null; }
export interface ScoreRow { id: string; studentId: string; date: string; item: string; value: number; note: string | null; }
export interface PlanRow {
  id: string; studentId: string; coachId: string; title: string; status: string;
  goalSummary: string | null; diagnosis: string | null; structure: string; coachNote: string | null;
  aiMeta: string | null; examDate: string | null; startDate: string | null; noticeRev: number; seenRev: number; attendanceReset: string | null; createdAt: string; updatedAt: string;
}

type Row = Record<string, unknown>;

function mapUser(r: Row): UserRow {
  return { id: r.id as string, email: r.email as string, passwordHash: r.password_hash as string, name: r.name as string, role: r.role as string, autoEnroll: Number(r.auto_enroll ?? 1), autoConfirmPlan: Number(r.auto_confirm_plan ?? 0), createdAt: r.created_at as string };
}
function mapStudent(r: Row): StudentRow {
  return {
    id: r.id as string, coachId: r.coach_id as string, name: r.name as string, gender: r.gender as string,
    birthDate: (r.birth_date as string) ?? null, height: (r.height as number) ?? null, weight: (r.weight as number) ?? null,
    trainingYears: (r.training_years as number) ?? null, examDate: (r.exam_date as string) ?? null,
    goalNote: (r.goal_note as string) ?? null, injuryNote: (r.injury_note as string) ?? null, note: (r.note as string) ?? null,
    accessCode: (r.access_code as string) ?? null, weekdays: (r.weekdays as string) ?? null,
    contact: (r.contact as string) ?? null, pending: Number(r.pending ?? 0),
    autoEnrolled: Number(r.auto_enrolled ?? 0), singleEnabled: Number(r.single_enabled ?? 0), singleEvent: (r.single_event as string) ?? null,
    missedCount: Number(r.missed_count ?? 0), locked: Number(r.locked ?? 0),
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}
function mapGoal(r: Row): GoalRow {
  return { id: r.id as string, studentId: r.student_id as string, event: r.event as string, target: r.target as number, note: (r.note as string) ?? null };
}
function mapScore(r: Row): ScoreRow {
  return { id: r.id as string, studentId: r.student_id as string, date: r.date as string, item: r.item as string, value: r.value as number, note: (r.note as string) ?? null };
}
function mapPlan(r: Row): PlanRow {
  return {
    id: r.id as string, studentId: r.student_id as string, coachId: r.coach_id as string, title: r.title as string,
    status: r.status as string, goalSummary: (r.goal_summary as string) ?? null, diagnosis: (r.diagnosis as string) ?? null,
    structure: r.structure as string, coachNote: (r.coach_note as string) ?? null, aiMeta: (r.ai_meta as string) ?? null,
    examDate: (r.exam_date as string) ?? null, startDate: (r.start_date as string) ?? null,
    noticeRev: Number(r.notice_rev ?? 0), seenRev: Number(r.seen_rev ?? 0), attendanceReset: (r.attendance_reset as string) ?? null,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

// ---------- users ----------
export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] });
  return rs.rows.length ? mapUser(rs.rows[0] as Row) : null;
}
export async function findUserById(id: string): Promise<UserRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
  return rs.rows.length ? mapUser(rs.rows[0] as Row) : null;
}
export async function setUserAutoEnroll(id: string, auto: number): Promise<void> {
  await getDb().execute({ sql: "UPDATE users SET auto_enroll=? WHERE id=?", args: [auto ? 1 : 0, id] });
}
export async function setUserAutoConfirm(id: string, v: number): Promise<void> {
  await getDb().execute({ sql: "UPDATE users SET auto_confirm_plan=? WHERE id=?", args: [v ? 1 : 0, id] });
}


export async function createUser(email: string, passwordHash: string, name: string): Promise<UserRow> {
  const id = randomUUID();
  await getDb().execute({
    sql: "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?,?,?,?,?,?)",
    args: [id, email, passwordHash, name, "coach", nowIso()],
  });
  return (await findUserById(id))!;
}

// ---------- students ----------
export async function listStudents(coachId: string): Promise<StudentRow[]> {
  const rs = await getDb().execute({ sql: "SELECT * FROM students WHERE coach_id = ? AND (pending IS NULL OR pending = 0) ORDER BY exam_date IS NULL, exam_date ASC, name ASC", args: [coachId] });
  return rs.rows.map((r) => mapStudent(r as Row));
}
/** 学生列表批量统计：每周训练天数（取最新计划的 daysPerWeek）+ 累计已打卡训练天数（去重日期） */
export async function listTrainingStatsByCoach(coachId: string): Promise<Record<string, { daysPerWeek: number | null; checkedDays: number }>> {
  const out: Record<string, { daysPerWeek: number | null; checkedDays: number }> = {};
  const plans = await getDb().execute({
    sql: "SELECT p.student_id, p.structure, p.created_at FROM plans p JOIN students s ON s.id=p.student_id WHERE s.coach_id=? ORDER BY p.created_at ASC",
    args: [coachId],
  });
  for (const row of plans.rows as Row[]) {
    const sid = row.student_id as string;
    let dpw: number | null = null;
    try {
      const meta = (JSON.parse((row.structure as string) || "{}") as { meta?: { daysPerWeek?: number } }).meta;
      dpw = typeof meta?.daysPerWeek === "number" ? meta.daysPerWeek : null;
    } catch { /* 结构异常忽略 */ }
    out[sid] = { daysPerWeek: dpw, checkedDays: out[sid]?.checkedDays ?? 0 };
  }
  const chk = await getDb().execute({
    sql: "SELECT c.student_id, COUNT(DISTINCT c.date) AS d FROM checkins c JOIN students s ON s.id=c.student_id WHERE s.coach_id=? GROUP BY c.student_id",
    args: [coachId],
  });
  for (const row of chk.rows as Row[]) {
    const sid = row.student_id as string;
    if (!out[sid]) out[sid] = { daysPerWeek: null, checkedDays: 0 };
    out[sid].checkedDays = Number(row.d);
  }
  return out;
}

/** 每个学生已生成计划的数量（一次查询，避免学生列表 N+1 慢查询） */
export async function countPlansByCoach(coachId: string): Promise<Record<string, number>> {
  const rs = await getDb().execute({
    sql: "SELECT student_id, COUNT(*) AS n FROM plans WHERE coach_id=? GROUP BY student_id",
    args: [coachId],
  });
  const out: Record<string, number> = {};
  for (const r of rs.rows as Row[]) out[r.student_id as string] = Number(r.n);
  return out;
}
export async function findStudent(id: string, coachId: string): Promise<StudentRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM students WHERE id = ? AND coach_id = ?", args: [id, coachId] });
  return rs.rows.length ? mapStudent(rs.rows[0] as Row) : null;
}
export interface StudentInput {
  name: string; gender: string; birthDate: string | null; height: number | null; weight: number | null;
  trainingYears: number | null; examDate: string | null; goalNote: string | null; injuryNote: string | null; note: string | null;
}
export async function createStudent(coachId: string, input: StudentInput): Promise<StudentRow> {
  const id = randomUUID();
  const t = nowIso();
  await getDb().execute({
    sql: `INSERT INTO students (id, coach_id, name, gender, birth_date, height, weight, training_years, exam_date, goal_note, injury_note, note, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [id, coachId, input.name, input.gender, input.birthDate, input.height, input.weight, input.trainingYears, input.examDate, input.goalNote, input.injuryNote, input.note, t, t],
  });
  return (await findStudent(id, coachId))!;
}
/** 新生通过“身体评估报名”自助提交：直接落库为待确认(pending=1)，成绩由 actions 另存 */
export async function createEnrolledStudent(coachId: string, input: {
  name: string; gender: string; birthDate: string | null; height: number | null; weight: number | null;
  trainingYears: number | null; examDate: string | null; goalNote: string | null; injuryNote: string | null;
  note: string | null; contact: string | null;
}): Promise<StudentRow> {
  const id = randomUUID();
  const t = nowIso();
  await getDb().execute({
    sql: `INSERT INTO students (id, coach_id, name, gender, birth_date, height, weight, training_years, exam_date, goal_note, injury_note, note, contact, pending, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
    args: [id, coachId, input.name, input.gender, input.birthDate, input.height, input.weight, input.trainingYears, input.examDate, input.goalNote, input.injuryNote, input.note, input.contact, t, t],
  });
  return (await findStudent(id, coachId))!;
}

/** 待确认新生列表 */
export async function listPendingStudents(coachId: string): Promise<StudentRow[]> {
  const rs = await getDb().execute({
    sql: "SELECT * FROM students WHERE coach_id=? AND (pending IS NOT NULL AND pending = 1) ORDER BY created_at DESC",
    args: [coachId],
  });
  return rs.rows.map((r) => mapStudent(r as Row));
}

/** 教练确认新生入库 */

export async function setStudentSingleEnabled(id: string, coachId: string, v: number): Promise<void> {
  await getDb().execute({ sql: "UPDATE students SET single_enabled=? WHERE id=? AND coach_id=?", args: [v ? 1 : 0, id, coachId] });
}

export async function setStudentSingleEvent(id: string, coachId: string, ev: string | null): Promise<void> {
  await getDb().execute({ sql: "UPDATE students SET single_event=? WHERE id=? AND coach_id=?", args: [ev, id, coachId] });
}
export async function setStudentAutoEnrolled(id: string): Promise<void> {
  await getDb().execute({ sql: "UPDATE students SET auto_enrolled=1 WHERE id=?", args: [id] });
}

export async function confirmStudentPending(id: string, coachId: string): Promise<void> {
  await getDb().execute({
    sql: "UPDATE students SET pending=0, updated_at=? WHERE id=? AND coach_id=?",
    args: [nowIso(), id, coachId],
  });
}
export async function updateStudent(id: string, coachId: string, input: StudentInput): Promise<StudentRow | null> {
  await getDb().execute({
    sql: `UPDATE students SET name=?, gender=?, birth_date=?, height=?, weight=?, training_years=?, exam_date=?, goal_note=?, injury_note=?, note=?, updated_at=? WHERE id=? AND coach_id=?`,
    args: [input.name, input.gender, input.birthDate, input.height, input.weight, input.trainingYears, input.examDate, input.goalNote, input.injuryNote, input.note, nowIso(), id, coachId],
  });
  return findStudent(id, coachId);
}
export async function deleteStudent(id: string, coachId: string): Promise<void> {
  await getDb().execute({ sql: "DELETE FROM checkins WHERE plan_id IN (SELECT id FROM plans WHERE student_id=? AND coach_id=?)", args: [id, coachId] });
  await getDb().execute({ sql: "DELETE FROM goals WHERE student_id=?", args: [id] });
  await getDb().execute({ sql: "DELETE FROM scores WHERE student_id=?", args: [id] });
  await getDb().execute({ sql: "DELETE FROM plans WHERE student_id=? AND coach_id=?", args: [id, coachId] });
  await getDb().execute({ sql: "DELETE FROM students WHERE id=? AND coach_id=?", args: [id, coachId] });
}

// ---------- goals ----------
export async function listGoals(studentId: string): Promise<GoalRow[]> {
  const rs = await getDb().execute({ sql: "SELECT * FROM goals WHERE student_id = ?", args: [studentId] });
  return rs.rows.map((r) => mapGoal(r as Row));
}
export async function setGoal(studentId: string, event: string, target: number, note: string | null): Promise<void> {
  const existing = await getDb().execute({ sql: "SELECT id FROM goals WHERE student_id=? AND event=?", args: [studentId, event] });
  if (existing.rows.length) {
    await getDb().execute({ sql: "UPDATE goals SET target=?, note=? WHERE student_id=? AND event=?", args: [target, note, studentId, event] });
  } else {
    await getDb().execute({ sql: "INSERT INTO goals (id, student_id, event, target, note) VALUES (?,?,?,?,?)", args: [randomUUID(), studentId, event, target, note] });
  }
}

// ---------- scores ----------
export async function listScores(studentId: string): Promise<ScoreRow[]> {
  const rs = await getDb().execute({ sql: "SELECT * FROM scores WHERE student_id = ? ORDER BY date ASC, item ASC", args: [studentId] });
  return rs.rows.map((r) => mapScore(r as Row));
}
export async function latestScoresByItem(studentId: string): Promise<Record<string, { value: number; date: string }>> {
  const rs = await getDb().execute({
    sql: `SELECT s.item, s.value, s.date FROM scores s
          JOIN (SELECT item, MAX(date) md FROM scores WHERE student_id=? GROUP BY item) m
          ON s.item=m.item AND s.date=m.md WHERE s.student_id=?`,
    args: [studentId, studentId],
  });
  const out: Record<string, { value: number; date: string }> = {};
  for (const r of rs.rows as Row[]) {
    out[r.item as string] = { value: r.value as number, date: r.date as string };
  }
  return out;
}
export async function addScore(studentId: string, date: string, item: string, value: number, note: string | null): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO scores (id, student_id, date, item, value, note) VALUES (?,?,?,?,?,?)",
    args: [randomUUID(), studentId, date, item, value, note],
  });
}
export async function deleteScore(id: string, studentId: string): Promise<void> {
  await getDb().execute({ sql: "DELETE FROM scores WHERE id=? AND student_id=?", args: [id, studentId] });
}

// ---------- plans ----------
export interface PlanInput {
  studentId: string; coachId: string; title: string; status: string; goalSummary: string | null;
  diagnosis: string | null; structure: string; coachNote: string | null; aiMeta: string | null; examDate: string | null; startDate: string | null;
}
export async function createPlan(input: PlanInput): Promise<PlanRow> {
  const id = randomUUID();
  const t = nowIso();
  await getDb().execute({
    sql: `INSERT INTO plans (id, student_id, coach_id, title, status, goal_summary, diagnosis, structure, coach_note, ai_meta, exam_date, start_date, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [id, input.studentId, input.coachId, input.title, input.status, input.goalSummary, input.diagnosis, input.structure, input.coachNote, input.aiMeta, input.examDate, input.startDate, t, t],
  });
  const rs = await getDb().execute({ sql: "SELECT * FROM plans WHERE id=?", args: [id] });
  return mapPlan(rs.rows[0] as Row);
}
export async function findPlan(id: string, coachId: string): Promise<PlanRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM plans WHERE id=? AND coach_id=?", args: [id, coachId] });
  return rs.rows.length ? mapPlan(rs.rows[0] as Row) : null;
}
export async function listPlans(studentId: string): Promise<PlanRow[]> {
  const rs = await getDb().execute({ sql: "SELECT * FROM plans WHERE student_id=? ORDER BY created_at DESC", args: [studentId] });
  return rs.rows.map((r) => mapPlan(r as Row));
}
export async function updatePlan(id: string, coachId: string, fields: { status?: string; coachNote?: string | null; title?: string }): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (fields.status !== undefined) { sets.push("status=?"); args.push(fields.status); }
  if (fields.coachNote !== undefined) { sets.push("coach_note=?"); args.push(fields.coachNote); }
  if (fields.title !== undefined) { sets.push("title=?"); args.push(fields.title); }
  sets.push("updated_at=?"); args.push(nowIso());
  args.push(id, coachId);
  await getDb().execute({ sql: `UPDATE plans SET ${sets.join(",")} WHERE id=? AND coach_id=?`, args });
}
export async function deletePlan(id: string, coachId: string): Promise<void> {
  await getDb().execute({ sql: "DELETE FROM checkins WHERE plan_id=?", args: [id] });
  await getDb().execute({ sql: "DELETE FROM plans WHERE id=? AND coach_id=?", args: [id, coachId] });
}

// ---------- 学生个人版：访问码 / 训练日 ----------
export async function findStudentByAccessCode(code: string): Promise<StudentRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM students WHERE access_code = ?", args: [code] });
  return rs.rows.length ? mapStudent(rs.rows[0] as Row) : null;
}
export async function setStudentAccessCode(studentId: string, coachId: string, code: string | null): Promise<void> {
  await getDb().execute({ sql: "UPDATE students SET access_code=?, updated_at=? WHERE id=? AND coach_id=?", args: [code, nowIso(), studentId, coachId] });
}
export async function setStudentWeekdays(studentId: string, weekdays: string | null): Promise<void> {
  await getDb().execute({ sql: "UPDATE students SET weekdays=?, updated_at=? WHERE id=?", args: [weekdays, nowIso(), studentId] });
}
export async function findActivePlan(studentId: string): Promise<PlanRow | null> {
  const rs = await getDb().execute({
    sql: "SELECT * FROM plans WHERE student_id=? ORDER BY (status='confirmed') DESC, created_at DESC LIMIT 1",
    args: [studentId],
  });
  return rs.rows.length ? mapPlan(rs.rows[0] as Row) : null;
}

// ---------- 学生打卡 ----------
export interface CheckinRow { id: string; studentId: string; planId: string; date: string; dayIndex: number; note: string | null; createdAt: string; }
function mapCheckin(r: Row): CheckinRow {
  return { id: r.id as string, studentId: r.student_id as string, planId: r.plan_id as string, date: r.date as string, dayIndex: r.day_index as number, note: (r.note as string) ?? null, createdAt: r.created_at as string };
}
export async function findCheckinByPlanDate(planId: string, date: string): Promise<CheckinRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM checkins WHERE plan_id=? AND date=?", args: [planId, date] });
  return rs.rows.length ? mapCheckin(rs.rows[0] as Row) : null;
}
export async function addCheckin(studentId: string, planId: string, date: string, dayIndex: number): Promise<CheckinRow> {
  const existing = await findCheckinByPlanDate(planId, date);
  if (existing) return existing;
  const id = randomUUID();
  await getDb().execute({
    sql: "INSERT INTO checkins (id, student_id, plan_id, date, day_index, note, created_at) VALUES (?,?,?,?,?,?,?)",
    args: [id, studentId, planId, date, dayIndex, null, nowIso()],
  });
  return (await findCheckinByPlanDate(planId, date))!;
}
export async function deleteCheckin(planId: string, date: string): Promise<void> {
  await getDb().execute({ sql: "DELETE FROM checkins WHERE plan_id=? AND date=?", args: [planId, date] });
}
export async function listCheckins(planId: string): Promise<CheckinRow[]> {
  const rs = await getDb().execute({ sql: "SELECT * FROM checkins WHERE plan_id=? ORDER BY date ASC", args: [planId] });
  return rs.rows.map((r) => mapCheckin(r as Row));
}

export async function findPlanForStudent(planId: string, studentId: string): Promise<PlanRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM plans WHERE id=? AND student_id=?", args: [planId, studentId] });
  return rs.rows.length ? mapPlan(rs.rows[0] as Row) : null;
}

export async function findStudentById(id: string): Promise<StudentRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM students WHERE id=?", args: [id] });
  return rs.rows.length ? mapStudent(rs.rows[0] as Row) : null;
}

export interface PlanContentFields {
  title?: string;
  status?: string;
  goalSummary?: string | null;
  diagnosis?: string | null;
  structure?: string;
  aiMeta?: string | null;
  startDate?: string | null;
  examDate?: string | null;
}
/** 整份覆盖计划内容（用于“按最新状态更新计划”） */
export async function updatePlanContent(id: string, coachId: string, fields: PlanContentFields): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const push = (col: string, val: unknown) => {
    if (val !== undefined) { sets.push(col + "=?"); args.push(val as string | number | null); }
  };
  push("title", fields.title);
  push("status", fields.status);
  push("goal_summary", fields.goalSummary);
  push("diagnosis", fields.diagnosis);
  push("structure", fields.structure);
  push("ai_meta", fields.aiMeta);
  push("start_date", fields.startDate);
  push("exam_date", fields.examDate);
  sets.push("updated_at=?");
  args.push(nowIso());
  args.push(id, coachId);
  const sql = "UPDATE plans SET " + sets.join(",") + " WHERE id=? AND coach_id=?";
  await getDb().execute({ sql, args });
}

/** 学生本人自助更新计划内容（用于“按反馈自动调整”，仅限本人计划） */
export async function updatePlanContentByStudent(id: string, studentId: string, fields: PlanContentFields): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const push = (col: string, val: unknown) => {
    if (val !== undefined) { sets.push(col + "=?"); args.push(val as string | number | null); }
  };
  push("title", fields.title);
  push("status", fields.status);
  push("goal_summary", fields.goalSummary);
  push("diagnosis", fields.diagnosis);
  push("structure", fields.structure);
  push("ai_meta", fields.aiMeta);
  push("start_date", fields.startDate);
  push("exam_date", fields.examDate);
  sets.push("updated_at=?");
  args.push(nowIso());
  args.push(id, studentId);
  const sql = "UPDATE plans SET " + sets.join(",") + " WHERE id=? AND student_id=?";
  await getDb().execute({ sql, args });
}

export async function updateUser(id: string, fields: { name?: string; passwordHash?: string }): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (fields.name !== undefined) { sets.push("name=?"); args.push(fields.name); }
  if (fields.passwordHash !== undefined) { sets.push("password_hash=?"); args.push(fields.passwordHash); }
  if (!sets.length) return;
  args.push(id);
  const sql = "UPDATE users SET " + sets.join(",") + " WHERE id=?";
  await getDb().execute({ sql, args });
}


// ================= 考勤：缺勤计数 / 封锁 / 解锁 =================
/** 学生在进入学生端时同步缺勤计数（locked 只在缺勤>=3 时置 1，不自动清除） */
export async function syncAttendance(studentId: string, missedCount: number, locked: number): Promise<void> {
  await getDb().execute({
    sql: "UPDATE students SET missed_count=?, locked=CASE WHEN ?=1 THEN 1 ELSE locked END, updated_at=? WHERE id=?",
    args: [Math.max(0, missedCount), locked, nowIso(), studentId],
  });
}

/** 教练解锁：清除封锁与缺勤计数，并把该生最新计划起点重置到今天（避免历史缺勤再次触发封锁） */
export async function unlockAttendance(studentId: string, coachId: string): Promise<void> {
  const today = localDateKey();
  await getDb().execute({
    sql: "UPDATE students SET locked=0, missed_count=0, updated_at=? WHERE id=? AND coach_id=?",
    args: [nowIso(), studentId, coachId],
  });
  // 只重置“考勤统计起点”，不改计划 start_date（start_date 决定训练周期第几周，改了会让学生退回第 1 周）
  await getDb().execute({
    sql: "UPDATE plans SET attendance_reset=?, updated_at=? WHERE student_id=? AND coach_id=? AND status='confirmed'",
    args: [today, nowIso(), studentId, coachId],
  });
}
// ================= 训练反馈（学生 -> 教练） =================
export interface FeedbackRow {
  id: string;
  studentId: string;
  planId: string | null;
  date: string;
  feel: number | null;      // 1-5：很轻松 / 正好 / 偏累 / 很累 / 练不动
  soreness: string | null;  // 不适部位说明
  note: string | null;
  createdAt: string;
}
function mapFeedback(r: Row): FeedbackRow {
  return {
    id: r.id as string,
    studentId: r.student_id as string,
    planId: (r.plan_id as string) ?? null,
    date: r.date as string,
    feel: r.feel == null ? null : Number(r.feel),
    soreness: (r.soreness as string) ?? null,
    note: (r.note as string) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function createFeedback(input: {
  studentId: string; planId: string | null; date: string;
  feel: number | null; soreness: string | null; note: string | null;
}): Promise<FeedbackRow> {
  const id = randomUUID();
  const t = nowIso();
  // 同一天只保留一份：重复提交视为“修改今天的反馈”
  await getDb().execute({ sql: "DELETE FROM feedback WHERE student_id=? AND date=?", args: [input.studentId, input.date] });
  await getDb().execute({
    sql: `INSERT INTO feedback (id, student_id, plan_id, date, feel, soreness, note, created_at)
          VALUES (?,?,?,?,?,?,?,?)`,
    args: [id, input.studentId, input.planId, input.date, input.feel, input.soreness, input.note, t],
  });
  return { id, studentId: input.studentId, planId: input.planId, date: input.date, feel: input.feel, soreness: input.soreness, note: input.note, createdAt: nowIso() };
}

export async function listFeedbackByStudent(studentId: string, limit = 50): Promise<FeedbackRow[]> {
  const rs = await getDb().execute({
    sql: "SELECT * FROM feedback WHERE student_id=? ORDER BY date DESC, created_at DESC LIMIT ?",
    args: [studentId, limit],
  });
  return rs.rows.map((r) => mapFeedback(r as Row));
}

/** 学生端“计划已更新”提示：教练更新计划内容时 +1 */
export async function bumpPlanNotice(planId: string, coachId: string): Promise<void> {
  await getDb().execute({
    sql: "UPDATE plans SET notice_rev = notice_rev + 1, updated_at=? WHERE id=? AND coach_id=?",
    args: [nowIso(), planId, coachId],
  });
}

/** 学生已读更新提示 */
export async function ackPlanNotice(planId: string, studentId: string): Promise<void> {
  await getDb().execute({
    sql: "UPDATE plans SET seen_rev = notice_rev WHERE id=? AND student_id=?",
    args: [planId, studentId],
  });
}






/** 教练补打卡后直接覆盖缺勤/封锁状态 */
export async function setStudentAttendance(studentId: string, missedCount: number, locked: number): Promise<void> {
  await getDb().execute({
    sql: "UPDATE students SET missed_count=?, locked=?, updated_at=? WHERE id=?",
    args: [Math.max(0, missedCount), locked ? 1 : 0, nowIso(), studentId],
  });
}
// ================= 请假（学生申请 -> 教练批准，批准日不算缺勤） =================
export type LeaveStatus = "pending" | "approved" | "rejected";
export interface LeaveRow {
  id: string; studentId: string; date: string; reason: string | null;
  status: LeaveStatus; createdAt: string; updatedAt: string;
}
function mapLeave(r: Row): LeaveRow {
  return {
    id: r.id as string,
    studentId: r.student_id as string,
    date: r.date as string,
    reason: (r.reason as string) ?? null,
    status: (r.status as LeaveStatus) ?? "pending",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function createLeave(studentId: string, date: string, reason: string | null): Promise<LeaveRow> {
  const id = randomUUID();
  const t = nowIso();
  await getDb().execute({
    sql: "INSERT INTO leaves (id, student_id, date, reason, status, created_at, updated_at) VALUES (?,?,?,?,'pending',?,?)",
    args: [id, studentId, date, reason, t, t],
  });
  return { id, studentId, date, reason, status: "pending", createdAt: t, updatedAt: t };
}

export async function listLeavesByStudent(studentId: string, limit = 30): Promise<LeaveRow[]> {
  const rs = await getDb().execute({
    sql: "SELECT * FROM leaves WHERE student_id=? ORDER BY date DESC, created_at DESC LIMIT ?",
    args: [studentId, limit],
  });
  return rs.rows.map((r) => mapLeave(r as Row));
}

/** 已批准的请假日期集合（这些天不算缺勤） */
export async function listApprovedLeaveDates(studentId: string): Promise<string[]> {
  const rs = await getDb().execute({
    sql: "SELECT date FROM leaves WHERE student_id=? AND status='approved'",
    args: [studentId],
  });
  return rs.rows.map((r) => r.date as string);
}

export async function findLeave(id: string): Promise<LeaveRow | null> {
  const rs = await getDb().execute({ sql: "SELECT * FROM leaves WHERE id=?", args: [id] });
  return rs.rows.length ? mapLeave(rs.rows[0] as Row) : null;
}

/** 教练批准/拒绝请假（须是该教练名下学生的请假，action 已校验归属） */
export async function updateLeaveStatusByCoach(id: string, status: LeaveStatus): Promise<void> {
  await getDb().execute({
    sql: "UPDATE leaves SET status=?, updated_at=? WHERE id=?",
    args: [status, nowIso(), id],
  });
}






/** 该教练名下仍有草稿计划的学生 id（用于“是否需要去核对”提示） */
export async function listDraftStudentIdsByCoach(coachId: string): Promise<string[]> {
  const rs = await getDb().execute({
    sql: "SELECT DISTINCT student_id FROM plans WHERE coach_id=? AND status='draft'",
    args: [coachId],
  });
  return rs.rows.map((r) => r.student_id as string);
}
