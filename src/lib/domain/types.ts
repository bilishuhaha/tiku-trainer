export type EventKey = "sprint" | "tripleJump" | "shotPut";
export type Gender = "male" | "female";
export type PhaseKey = "base" | "build" | "specific" | "taper";
export type Severity = "high" | "medium" | "low";

export interface ItemDef {
  key: string;
  label: string;
  unit: string;
  dir: "up" | "down"; // up = 数值越大越好, down = 越小越好
  group: "sprint" | "jump" | "throw" | "strength";
  note?: string;
  event?: EventKey;
}

export interface EventDef {
  key: EventKey;
  label: string;
  shortLabel: string;
  primaryItem: string;
  items: string[];
  testTip: string;
}

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  advice: string;
  event: EventKey | "general";
}

/** 弱点轴权重（0-100），供计划生成器调整侧重 */
export interface FocusWeights {
  accel: number;        // 起跑/加速
  maxSpeed: number;     // 最大速度/途中跑
  speedEnd: number;     // 速度耐力/后程
  jumpPower: number;    // 下肢爆发/弹跳
  jumpTech: number;     // 三级跳技术
  throwPower: number;   // 投掷爆发/全身用力
  throwTech: number;    // 铅球技术
  strength: number;     // 基础力量
  core: number;         // 核心
}

export interface DiagnosisResult {
  findings: Finding[];
  focus: FocusWeights;
  summaryLines: string[];
  eventNotes: Partial<Record<EventKey, string>>;
}

export interface ExerciseDoc {
  name: string;
  dose: string;
  intensity?: string;
  rest?: string;
  cue?: string;
}

export interface BlockDoc {
  kind: "warmup" | "main" | "aux" | "core" | "cooldown" | "test";
  label: string;
  items: ExerciseDoc[];
}

export interface DayDoc {
  day: number;
  title: string;
  durationMin: number;
  blocks: BlockDoc[];
  techNotes: string[];
}

export interface PeriodDoc {
  key: PhaseKey;
  name: string;
  weeks: number;
  goal: string;
  principles: string[];
  progression: string;
  weeklySchedule: DayDoc[];
}

export interface PlanDoc {
  version: number;
  meta: {
    generatedAt: string;
    weeksToExam: number | null;
    daysPerWeek: number;
    mode: "rule" | "llm";
    examDate: string | null;
    title: string;
    coachAdvice: string[];
    basis: string[];
  };
  diagnosis: {
    summaryLines: string[];
    findings: Finding[];
  };
  calendar: { week: number; phaseKey: PhaseKey; phaseName: string; note: string }[];
  periods: PeriodDoc[];
  safety: string[];
  reassessment: string[];
}

export interface PlanRequest {
  student: {
    id: string;
    name: string;
    gender: Gender;
    weightKg: number | null;
    trainingYears: number | null;
    examDate: string | null;
    injuryNote: string | null;
  };
  latest: Record<string, { value: number; date: string }>;
  goals: Record<EventKey, number | null>;
  daysPerWeek: number;
}
