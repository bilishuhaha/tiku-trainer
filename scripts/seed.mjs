// 初始化示例数据：默认教练账号 + 示例学生（含目标与成绩）
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL || "file:./data/tiku.db";
const filePath = url.startsWith("file:") ? url.slice(5) : url;
fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
const db = createClient({ url });

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'coach', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, coach_id TEXT NOT NULL, name TEXT NOT NULL, gender TEXT NOT NULL DEFAULT 'male', birth_date TEXT, height REAL, weight REAL, training_years REAL, exam_date TEXT, goal_note TEXT, injury_note TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, event TEXT NOT NULL, target REAL NOT NULL, note TEXT, UNIQUE(student_id, event))`,
  `CREATE TABLE IF NOT EXISTS scores (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, date TEXT NOT NULL, item TEXT NOT NULL, value REAL NOT NULL, note TEXT)`,
  `CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, coach_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', goal_summary TEXT, diagnosis TEXT, structure TEXT NOT NULL, coach_note TEXT, ai_meta TEXT, exam_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
];
for (const d of DDL) await db.execute(d);

const now = new Date().toISOString();
const email = "coach@tiku.local";
const password = "coach123456";

const existing = await db.execute({ sql: "SELECT id FROM users WHERE email=?", args: [email] });
let coachId;
if (existing.rows.length) {
  coachId = existing.rows[0].id;
  console.log("教练账号已存在，跳过创建。");
} else {
  coachId = randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await db.execute({
    sql: "INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES (?,?,?,?,?,?)",
    args: [coachId, email, hash, "王教练", "coach", now],
  });
  console.log(`已创建教练账号：${email} / ${password}`);
}

const sampleName = "李明";
const dup = await db.execute({ sql: "SELECT id FROM students WHERE coach_id=? AND name=?", args: [coachId, sampleName] });
if (!dup.rows.length) {
  const sid = randomUUID();
  await db.execute({
    sql: `INSERT INTO students (id, coach_id, name, gender, birth_date, height, weight, training_years, exam_date, goal_note, injury_note, note, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [sid, coachId, sampleName, "male", "2008-06-15", 178, 70, 1, "2027-04-10", "目标：XX 大学体育教育专业，术科 255 分", null, "高三，每天下午 4:30-6:30 训练", now, now],
  });
  const goals = [
    ["sprint", 11.9, "100米目标"],
    ["tripleJump", 8.1, "立定三级跳远目标"],
    ["shotPut", 11.2, "原地推铅球目标（男5kg）"],
  ];
  for (const [ev, target, note] of goals) {
    await db.execute({
      sql: "INSERT INTO goals (id, student_id, event, target, note) VALUES (?,?,?,?,?)",
      args: [randomUUID(), sid, ev, target, note],
    });
  }
  const scores = [
    ["2026-08-20", "sprint30", 4.62], ["2026-08-20", "sprint60", 8.42], ["2026-08-20", "sprint100", 12.85],
    ["2026-08-20", "standingLongJump", 2.5], ["2026-08-20", "tripleJump", 7.25],
    ["2026-08-20", "shotPut", 9.6], ["2026-08-20", "medBallBack", 11.5],
    ["2026-09-01", "sprint30", 4.55], ["2026-09-01", "sprint60", 8.35], ["2026-09-01", "sprint100", 12.6],
    ["2026-09-01", "standingLongJump", 2.55], ["2026-09-01", "tripleJump", 7.4],
    ["2026-09-01", "shotPut", 9.8], ["2026-09-01", "medBallBack", 11.9],
  ];
  for (const [date, item, value] of scores) {
    await db.execute({
      sql: "INSERT INTO scores (id, student_id, date, item, value, note) VALUES (?,?,?,?,?,?)",
      args: [randomUUID(), sid, date, item, value, "示例数据"],
    });
  }
  console.log(`已创建示例学生：${sampleName}（含目标成绩与两轮测试记录，可直接生成计划体验）。`);
} else {
  console.log("示例学生已存在，跳过。");
}
console.log("Seed 完成 ✅");
