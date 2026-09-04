import { getDb, nowIso } from "./db";
import { randomUUID } from "node:crypto";

export interface UserRow { id: string; email: string; passwordHash: string; name: string; role: string; createdAt: string; }
export interface StudentRow {
  id: string; coachId: string; name: string; gender: string;
  birthDate: string | null; height: number | null; weight: number | null;
  trainingYears: number | null; examDate: string | null; goalNote: string | null;
  injuryNote: string | null; note: string | null; accessCode: string | null; weekdays: string | null;
  createdAt: string; updatedAt: string;
}
export interface GoalRow { id: string; studentId: string; event: string; target: number; note: string | null; }
export interface ScoreRow { id: string; studentId: string; date: string; item: string; value: number; note: string | null; }
export interface PlanRow {
  id: string; studentId: string; coachId: string; title: string; status: string;
  goalSummary: string | null; diagnosis: string | null; structure: string; coachNote: string | null;
  aiMeta: string | null; examDate: string | null; startDate: string | null; createdAt: string; updatedAt: string;
}

type Row = Record<string, unknown>;

function mapUser(r: Row): UserRow {
  return { id: r.id as string, email: r.email as string, passwordHash: r.password_hash as string, name: r.name as string, role: r.role as string, createdAt: r.created_at as string };
}
function mapStudent(r: Row): StudentRow {
  return {
    id: r.id as string, coachId: r.coach_id as string, name: r.name as string, gender: r.gender as string,
    birthDate: (r.birth_date as string) ?? null, height: (r.height as number) ?? null, weight: (r.weight as number) ?? null,
    trainingYears: (r.training_years as number) ?? null, examDate: (r.exam_date as string) ?? null,
    goalNote: (r.goal_note as string) ?? null, injuryNote: (r.injury_note as string) ?? null, note: (r.note as string) ?? null,
    accessCode: (r.access_code as string) ?? null, weekdays: (r.weekdays as string) ?? null,
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
  const rs = await getDb().execute({ sql: "SELECT * FROM students WHERE coach_id = ? ORDER BY exam_date IS NULL, exam_date ASC, name ASC", args: [coachId] });
  return rs.rows.map((r) => mapStudent(r as Row));
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
export async function updateStudent(id: string, coachId: string, input: StudentInput): Promise<StudentRow | null> {
  await getDb().execute({
    sql: `UPDATE students SET name=?, gender=?, birth_date=?, height=?, weight=?, training_years=?, exam_date=?, goal_note=?, injury_note=?, note=?, updated_at=? WHERE id=? AND coach_id=?`,
    args: [input.name, input.gender, input.birthDate, input.height, input.weight, input.trainingYears, input.examDate, input.goalNote, input.injuryNote, input.note, nowIso(), id, coachId],
  });
  return findStudent(id, coachId);
}
export async function deleteStudent(id: string, coachId: string): Promise<void> {
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
