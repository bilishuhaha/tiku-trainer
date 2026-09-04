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
  void ensureColumns(client);
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
    access_code TEXT,
    weekdays TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_students_coach ON students(coach_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_students_access_code ON students(access_code)`,
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
    start_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_plans_student ON plans(student_id)`,
  `CREATE TABLE IF NOT EXISTS checkins (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    date TEXT NOT NULL,
    day_index INTEGER NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_plan_date ON checkins(plan_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_checkins_student ON checkins(student_id, date)`,
];

function ensureTables(c: Client) {
  for (const ddl of DDL) {
    c.execute(ddl);
  }
}

async function ensureColumns(c: Client) {
  try {
    const addColumnIfMissing = async (table: string, column: string, ddl: string) => {
      const info = await c.execute(`PRAGMA table_info(${table})`);
      const names = new Set(info.rows.map((r) => (r as Record<string, unknown>).name as string));
      if (!names.has(column)) {
        try {
          await c.execute(ddl);
        } catch {
          // 忽略（并发等）
        }
      }
    };
    await addColumnIfMissing("students", "access_code", "ALTER TABLE students ADD COLUMN access_code TEXT");
    await addColumnIfMissing("students", "weekdays", "ALTER TABLE students ADD COLUMN weekdays TEXT");
    await addColumnIfMissing("plans", "start_date", "ALTER TABLE plans ADD COLUMN start_date TEXT");
  } catch {
    // 尽力迁移，失败不阻塞
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
