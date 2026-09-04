"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, createStudentSession, destroySession, destroyStudentSession, requireStudent, requireUser, verifyCredentials } from "./auth";
import { EVENTS, ITEMS } from "./domain/items";
import { buildPlanDoc } from "./domain/plan";
import { enhanceWithLlm } from "./domain/llm";
import type { EventKey, PlanRequest } from "./domain/types";
import { localDateKey } from "./format";
import {
  addCheckin, addScore, createPlan, createStudent, deleteCheckin, deletePlan, deleteScore, deleteStudent,
  findActivePlan, findCheckinByPlanDate, findPlan, findPlanForStudent, findStudent, findStudentByAccessCode,
  listGoals, latestScoresByItem, setGoal, setStudentAccessCode, setStudentWeekdays, updatePlan, updateStudent,
} from "./repo";

const str = (fd: FormData, k: string) => (fd.get(k) as string | null) ?? "";
const numOrNull = (s: string) => (s === "" ? null : Number(s));
const dateOrNull = (s: string) => (s === "" ? null : s);

/** 统一错误跳转：带 ?error= 回到原页面展示 */
function errTo(url: string, msg: string): never {
  redirect(`${url}${url.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
}

// ---------- 认证 ----------
export async function loginAction(fd: FormData): Promise<void> {
  const email = str(fd, "email").trim();
  const password = str(fd, "password");
  if (!email || !password) return redirect(`/login?error=${encodeURIComponent("请输入邮箱和密码")}`);
  const user = await verifyCredentials(email, password);
  if (!user) return redirect(`/login?error=${encodeURIComponent("邮箱或密码不正确")}&email=${encodeURIComponent(email)}`);
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---------- 学生 ----------
const studentSchema = z.object({
  name: z.string().min(1, "请填写姓名").max(40),
  gender: z.enum(["male", "female"]),
});

function parseStudentInput(fd: FormData) {
  const raw = {
    name: str(fd, "name").trim(),
    gender: str(fd, "gender") === "female" ? "female" : "male",
    birthDate: dateOrNull(str(fd, "birthDate")),
    height: numOrNull(str(fd, "height")),
    weight: numOrNull(str(fd, "weight")),
    trainingYears: numOrNull(str(fd, "trainingYears")),
    examDate: dateOrNull(str(fd, "examDate")),
    goalNote: str(fd, "goalNote") || null,
    injuryNote: str(fd, "injuryNote") || null,
    note: str(fd, "note") || null,
  };
  const parsed = studentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入有误", data: null as null };
  return { error: null, data: raw };
}

export async function createStudentAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const { error, data } = parseStudentInput(fd);
  if (error || !data) return errTo("/students/new", error ?? "输入有误");
  const s = await createStudent(user.id, data);
  redirect(`/students/${s.id}`);
}

export async function updateStudentAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = str(fd, "id");
  const existing = await findStudent(id, user.id);
  if (!existing) return errTo("/students", "学生不存在");
  const { error, data } = parseStudentInput(fd);
  if (error || !data) return errTo(`/students/${id}/edit`, error ?? "输入有误");
  await updateStudent(id, user.id, data);
  redirect(`/students/${id}`);
}

export async function deleteStudentAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = str(fd, "id");
  await deleteStudent(id, user.id);
  redirect("/");
}

// ---------- 目标成绩 ----------
export async function setGoalAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const studentId = str(fd, "studentId");
  const student = await findStudent(studentId, user.id);
  if (!student) return errTo("/students", "学生不存在");
  const event = str(fd, "event") as EventKey;
  if (!EVENTS[event]) return errTo(`/students/${studentId}`, "项目无效");
  const target = Number(str(fd, "target"));
  if (!Number.isFinite(target) || target <= 0) return errTo(`/students/${studentId}`, "目标成绩必须为正数");
  await setGoal(studentId, event, target, str(fd, "goalNote") || null);
  redirect(`/students/${studentId}`);
}

// ---------- 成绩 ----------
export async function addScoreAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const studentId = str(fd, "studentId");
  const student = await findStudent(studentId, user.id);
  if (!student) return errTo("/students", "学生不存在");
  const date = str(fd, "date");
  const item = str(fd, "item");
  const value = Number(str(fd, "value"));
  if (!date) return errTo(`/students/${studentId}`, "请选择测试日期");
  if (!ITEMS[item]) return errTo(`/students/${studentId}`, "测试项目无效");
  if (!Number.isFinite(value) || value <= 0) return errTo(`/students/${studentId}`, "成绩必须为正数");
  await addScore(studentId, date, item, value, str(fd, "note") || null);
  redirect(`/students/${studentId}`);
}

export async function deleteScoreAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const studentId = str(fd, "studentId");
  const student = await findStudent(studentId, user.id);
  if (!student) return errTo("/students", "学生不存在");
  const id = str(fd, "id");
  await deleteScore(id, studentId);
  redirect(`/students/${studentId}`);
}

// ---------- 计划 ----------
export async function generatePlanAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const studentId = str(fd, "studentId");
  const student = await findStudent(studentId, user.id);
  if (!student) return errTo("/students", "学生不存在");
  const daysRaw = Number(str(fd, "daysPerWeek") || "6");
  const daysPerWeek = daysRaw === 4 || daysRaw === 5 ? daysRaw : 6;
  const goals = await listGoals(studentId);
  const latest = await latestScoresByItem(studentId);
  const goalMap: Record<EventKey, number | null> = { sprint: null, tripleJump: null, shotPut: null };
  for (const g of goals) {
    if (g.event in goalMap) (goalMap as Record<string, number | null>)[g.event] = g.target;
  }
  const req: PlanRequest = {
    student: {
      id: student.id,
      name: student.name,
      gender: student.gender === "female" ? "female" : "male",
      weightKg: student.weight,
      trainingYears: student.trainingYears,
      examDate: student.examDate,
      injuryNote: student.injuryNote,
    },
    latest,
    goals: goalMap,
    daysPerWeek,
  };
  const doc = buildPlanDoc(req, { daysPerWeek });
  const wantLlm = str(fd, "useLlm") === "1" && !!process.env.OPENAI_API_KEY;
  if (wantLlm) {
    const enhanced = await enhanceWithLlm(doc);
    if (enhanced) {
      doc.meta.mode = enhanced.mode;
      doc.meta.coachAdvice = enhanced.coachAdvice;
      doc.meta.basis = enhanced.basis;
    }
  }
  const plan = await createPlan({
    studentId: student.id,
    coachId: user.id,
    title: doc.meta.title,
    status: "draft",
    goalSummary: doc.meta.coachAdvice.join("\n"),
    diagnosis: JSON.stringify(doc.diagnosis),
    structure: JSON.stringify(doc),
    coachNote: null,
    aiMeta: JSON.stringify({ mode: doc.meta.mode, daysPerWeek, generatedAt: doc.meta.generatedAt }),
    examDate: student.examDate,
    startDate: localDateKey(),
  });
  redirect(`/plans/${plan.id}`);
}

export async function confirmPlanAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = str(fd, "id");
  const plan = await findPlan(id, user.id);
  if (!plan) return errTo("/students", "计划不存在");
  await updatePlan(id, user.id, { status: "confirmed" });
  redirect(`/plans/${id}`);
}

export async function updatePlanNoteAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = str(fd, "id");
  const plan = await findPlan(id, user.id);
  if (!plan) return errTo("/students", "计划不存在");
  await updatePlan(id, user.id, { coachNote: str(fd, "coachNote") || null });
  redirect(`/plans/${id}`);
}

export async function deletePlanAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = str(fd, "id");
  const plan = await findPlan(id, user.id);
  if (!plan) return errTo("/students", "计划不存在");
  const studentId = plan.studentId;
  await deletePlan(id, user.id);
  redirect(`/students/${studentId}`);
}

// ---------- 教练端：学生个人版访问码 ----------
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

export async function generateAccessCodeAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const studentId = str(fd, "studentId");
  const student = await findStudent(studentId, user.id);
  if (!student) return errTo("/students", "学生不存在");
  const code = randomCode();
  await setStudentAccessCode(studentId, user.id, code);
  redirect(`/students/${studentId}?ok=access`);
}

export async function clearAccessCodeAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const studentId = str(fd, "studentId");
  const student = await findStudent(studentId, user.id);
  if (!student) return errTo("/students", "学生不存在");
  await setStudentAccessCode(studentId, user.id, null);
  redirect(`/students/${studentId}?ok=access-off`);
}

// ---------- 学生端：登录 / 退出 ----------
export async function studentLoginAction(fd: FormData): Promise<void> {
  const code = str(fd, "code").trim().toUpperCase();
  if (!code) return redirect(`/s/login?error=${encodeURIComponent("请输入访问码")}`);
  const student = await findStudentByAccessCode(code);
  if (!student) return redirect(`/s/login?error=${encodeURIComponent("访问码不正确，请向教练核对")}`);
  await createStudentSession({ id: student.id, name: student.name });
  redirect("/s");
}

export async function studentLogoutAction(): Promise<void> {
  await destroyStudentSession();
  redirect("/s/login");
}

// ---------- 学生端：打卡 ----------
export async function toggleCheckinAction(fd: FormData): Promise<void> {
  const me = await requireStudent();
  const planId = str(fd, "planId");
  const date = str(fd, "date");
  const dayIndex = Number(str(fd, "dayIndex"));
  const plan = await findPlanForStudent(planId, me.id);
  if (!plan) return redirect("/s?error=" + encodeURIComponent("计划不存在"));
  if (!date) return redirect("/s?error=" + encodeURIComponent("日期无效"));
  const existing = await findCheckinByPlanDate(planId, date);
  if (existing) {
    await deleteCheckin(planId, date);
  } else {
    await addCheckin(me.id, planId, date, Number.isFinite(dayIndex) ? dayIndex : 0);
  }
  redirect("/s");
}

// ---------- 学生端：我的训练日 ----------
export async function setMyWeekdaysAction(fd: FormData): Promise<void> {
  const me = await requireStudent();
  const active = await findActivePlan(me.id);
  if (!active) return redirect("/s?error=" + encodeURIComponent("还没有训练计划"));
  const doc = JSON.parse(active.structure) as { meta?: { daysPerWeek?: number } };
  const k = doc.meta?.daysPerWeek ?? 6;
  const values = fd.getAll("wd").map((x) => Number(x)).filter((n) => n >= 1 && n <= 7);
  const uniq = [...new Set(values)].sort((x, y) => x - y);
  if (uniq.length !== k) return redirect("/s?error=" + encodeURIComponent(`请正好选择 ${k} 天作为训练日`));
  await setStudentWeekdays(me.id, uniq.join(","));
  redirect("/s");
}
