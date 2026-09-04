import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

function resolveDbUrl(url: string): string {
  if (url.startsWith("file:")) {
    const p = url.slice(5);
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    return "file:" + abs;
  }
  return url;
}

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;
  const url = resolveDbUrl(process.env.DATABASE_URL || "file:./data/tiku.db");
  const filePath = url.slice(5);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  client = createClient({ url });
  ensureTables(client);
  return client;
}

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'coach',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    coach_id TEXT NOT NULL,
    name TEXT NOT NULL,
    gender TEXT NOT NULL DEFAULT 'male',
    birth_date TEXT,
    height REAL,
    weight REAL,
    training_years REAL,
    exam_date TEXT,
    goal_note TEXT,
    injury_note TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_students_coach ON students(coach_id)`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    event TEXT NOT NULL,
    target REAL NOT NULL,
    note TEXT,
    UNIQUE(student_id, event)
  )`,
  `CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    date TEXT NOT NULL,
    item TEXT NOT NULL,
    value REAL NOT NULL,
    note TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id, item, date)`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    goal_summary TEXT,
    diagnosis TEXT,
    structure TEXT NOT NULL,
    coach_note TEXT,
    ai_meta TEXT,
    exam_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_plans_student ON plans(student_id)`,
];

function ensureTables(c: Client) {
  for (const ddl of DDL) {
    c.execute(ddl);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
