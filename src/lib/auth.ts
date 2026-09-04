import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { findUserByEmail, findUserById, type UserRow } from "./repo";

const COOKIE = "tk_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 天

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret-change-me-please-123456";
  return new TextEncoder().encode(secret);
}

export interface SessionUser { id: string; email: string; name: string; role: string; }

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE_SEC)
    .sign(getSecret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return { id: payload.sub, email: (payload.email as string) || "", name: (payload.name as string) || "", role: (payload.role as string) || "coach" };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function verifyCredentials(email: string, password: string): Promise<UserRow | null> {
  const user = await findUserByEmail(email.toLowerCase().trim());
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function loadUserFromDb(id: string): Promise<UserRow | null> {
  return findUserById(id);
}

// ================= 学生个人版会话 =================
const STUDENT_COOKIE = "tk_student";
const STUDENT_MAX_AGE_SEC = 60 * 60 * 24 * 90; // 90 天

export interface StudentSession { id: string; name: string; }

export async function createStudentSession(s: StudentSession): Promise<void> {
  const token = await new SignJWT({ name: s.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + STUDENT_MAX_AGE_SEC)
    .sign(getSecret());
  const store = await cookies();
  store.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: STUDENT_MAX_AGE_SEC,
  });
}

export async function destroyStudentSession(): Promise<void> {
  const store = await cookies();
  store.delete(STUDENT_COOKIE);
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const store = await cookies();
  const token = store.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return { id: payload.sub, name: (payload.name as string) || "学生" };
  } catch {
    return null;
  }
}

export async function requireStudent(): Promise<StudentSession> {
  const s = await getStudentSession();
  if (!s) redirect("/s/login");
  return s;
}
