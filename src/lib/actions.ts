"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, requireUser, verifyCredentials } from "./auth";
import { EVENTS, ITEMS } from "./domain/items";
import { buildPlanDoc } from "./domain/plan";
import { enhanceWithLlm } from "./domain/llm";
import type { EventKey, PlanRequest } from "./domain/types";
import {
  addScore, createPlan, createStudent, deletePlan, deleteScore, deleteStudent, findPlan,
  findStudent, listGoals, latestScoresByItem, setGoal, updatePlan, updateStudent,
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
