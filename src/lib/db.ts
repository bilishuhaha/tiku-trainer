import { createClient as createLibsql, type Client as LibsqlClient } from "@libsql/client";
import postgres, { type Sql } from "postgres";
import path from "node:path";
import fs from "node:fs";

export type Row = Record<string, unknown>;
export interface DbResult { rows: Row[] }
export type ExecInput = { sql: string; args?: (string | number | null)[] } | string;

export interface Db {
  execute(q: ExecInput): Promise<DbResult>;
}

function resolveDbUrl(url: string): string {
  if (url.startsWith("file:")) {
    const p = url.slice(5);
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    return "file:" + abs;
  }
  return url;
}

function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://") || url.startsWith("prisma+postgres://");
}

// ============ SQLite（本地 / 开发） ============
class SqliteDb implements Db {
  private c: LibsqlClient;
  constructor(c: LibsqlClient) { this.c = c; }
  async execute(q: ExecInput): Promise<DbResult> {
    if (typeof q === "string") {
      const r = await this.c.execute(q);
      return { rows: r.rows as Row[] };
    }
    const r = await this.c.execute({ sql: q.sql, args: q.args ?? [] });
    return { rows: r.rows as Row[] };
  }
}

// ============ PostgreSQL（云端 / 生产，如 Supabase、Neon） ============
function convertPlaceholders(sql: string, argsCount: number): string {
  let i = 0;
  const out = sql.replace(/\?/g, () => `$${++i}`);
  if (i !== argsCount) {
    throw new Error(`占位符数量不匹配：SQL 有 ${i} 个 ?，参数有 ${argsCount} 个`);
  }
  return out;
}

class PostgresDb implements Db {
  private sql: Sql;
  constructor(client: Sql) { this.sql = client; }
  async execute(q: ExecInput): Promise<DbResult> {
    if (typeof q === "string") {
      const rows = await this.sql.unsafe(q);
      return { rows: rows as Row[] };
    }
    const args = q.args ?? [];
    const stmt = convertPlaceholders(q.sql, args.length);
    const rows = await this.sql.unsafe(stmt, args as never[]);
    return { rows: rows as Row[] };
  }
}

// ============ DDL（两种数据库通用语法） ============
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

let db: Db | null = null;
let readyPromise: Promise<void> | null = null;

async function createDb(): Promise<Db> {
  const url = resolveDbUrl(process.env.DATABASE_URL || "file:./data/tiku.db");
  if (isPostgresUrl(url)) {
    const client = postgres(url, { max: 5, connect_timeout: 15 });
    return new PostgresDb(client);
  }
  const filePath = url.slice(5);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const c = createLibsql({ url });
  return new SqliteDb(c);
}

/** 建表 / 补列（幂等），首次真正执行查询前只跑一次 */
async function ensureReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const instance = await createDb();
    db = instance;
    for (const ddl of DDL) {
      await instance.execute(ddl);
    }
    const url = resolveDbUrl(process.env.DATABASE_URL || "file:./data/tiku.db");
    if (!isPostgresUrl(url)) {
      await ensureSqliteColumns(instance);
    }
  })().catch((e) => {
    readyPromise = null; // 允许重试
    throw e;
  });
  return readyPromise;
}

async function ensureSqliteColumns(instance: Db) {
  const addColumnIfMissing = async (table: string, column: string, ddl: string) => {
    const info = await instance.execute(`PRAGMA table_info(${table})`);
    const names = new Set(info.rows.map((r) => r.name as string));
    if (!names.has(column)) {
      try {
        await instance.execute(ddl);
      } catch {
        // 忽略并发等错误
      }
    }
  };
  await addColumnIfMissing("students", "access_code", "ALTER TABLE students ADD COLUMN access_code TEXT");
  await addColumnIfMissing("students", "weekdays", "ALTER TABLE students ADD COLUMN weekdays TEXT");
  await addColumnIfMissing("plans", "start_date", "ALTER TABLE plans ADD COLUMN start_date TEXT");
}

export function getDb(): Db {
  const handler: Db = {
    async execute(q: ExecInput): Promise<DbResult> {
      await ensureReady();
      if (!db) throw new Error("数据库未初始化");
      return db.execute(q);
    },
  };
  return handler;
}

export async function initDatabaseForTests(): Promise<void> {
  await ensureReady();
}

export function nowIso(): string {
  return new Date().toISOString();
}
