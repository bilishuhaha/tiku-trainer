import { diagnose } from "./diagnose";
import { buildWeekSchedule, phaseGoalText } from "./sessions";
import { weeksUntil } from "../format";
import type { DiagnosisResult, FocusWeights, PeriodDoc, PhaseKey, PlanDoc, PlanRequest } from "./types";

export interface BuildPlanOptions {
  daysPerWeek: number;
}

const WEAK_ORDER: [keyof FocusWeights, string][] = [
  ["accel", "accel"],
  ["maxSpeed", "maxSpeed"],
  ["speedEnd", "speedEnd"],
  ["jumpPower", "jumpPower"],
  ["jumpTech", "jumpTech"],
  ["throwPower", "throwPower"],
  ["throwTech", "throwTech"],
  ["strength", "strength"],
  ["core", "core"],
];

export function topWeakKey(focus: FocusWeights): string {
  let best: [keyof FocusWeights, string] = WEAK_ORDER[0];
  for (const pair of WEAK_ORDER) {
    if (focus[pair[0]] > focus[best[0]]) best = pair;
  }
  return best[1];
}

interface PhasePlan {
  key: PhaseKey;
  name: string;
  weeks: number;
}

/** 由剩余周数切分周期（按现代周期训练思想：基础→强化→专项→赛前） */
export function planPhases(weeks: number): PhasePlan[] {
  if (weeks <= 0) weeks = 1;
  if (weeks <= 4) {
    return [
      { key: "build", name: "强化冲刺（短周期）", weeks: Math.max(1, weeks - 1) },
      { key: "taper", name: "赛前调整", weeks: 1 },
    ];
  }
  if (weeks <= 8) {
    const specific = Math.max(1, Math.round(weeks * 0.35));
    const taper = Math.max(1, Math.round(weeks * 0.2));
    let build = weeks - specific - taper;
    if (build < 2) { build = 2; }
    // 修正使总和 = weeks
    let total = build + specific + taper;
    while (total > weeks && build > 2) { build--; total--; }
    while (total < weeks) { build++; total++; }
    return [
      { key: "build", name: "强化期", weeks: build },
      { key: "specific", name: "专项期", weeks: specific },
      { key: "taper", name: "赛前调整", weeks: taper },
    ];
  }
  // weeks > 8
  const base = Math.max(2, Math.round(weeks * 0.3));
  const build = Math.max(2, Math.round(weeks * 0.3));
  const specific = Math.max(2, Math.round(weeks * 0.25));
  let taper = weeks - base - build - specific;
  if (taper < 2) {
    const borrow = 2 - taper;
    if (base > 2) { taper += Math.min(borrow, base - 2); }
  }
  // 重新规整，确保总和等于 weeks
  const keys: PhaseKey[] = ["base", "build", "specific", "taper"];
  const arr: PhasePlan[] = [
    { key: "base", name: "基础期（一般准备）", weeks: base },
    { key: "build", name: "强化期（专项力量）", weeks: build },
    { key: "specific", name: "专项期（模拟考试）", weeks: specific },
    { key: "taper", name: "赛前调整", weeks: taper },
  ];
  let sum = arr.reduce((s, p) => s + p.weeks, 0);
  let i = 0;
  while (sum !== weeks && i < 100) {
    if (sum < weeks) {
      const target = keys.find((k) => k !== "taper");
      const p = arr.find((x) => x.key === target)!;
      p.weeks++;
    } else {
      // 从非 taper 且周数最多的阶段减
      const p = arr.filter((x) => x.key !== "taper").reduce((a, b) => (b.weeks > a.weeks ? b : a));
      if (p.weeks > 2) p.weeks--; else arr.find((x) => x.key === "taper")!.weeks--;
    }
    sum = arr.reduce((s2, p2) => s2 + p2.weeks, 0);
    i++;
  }
  return arr.filter((p) => p.weeks > 0);
}

export const PHASE_NAMES: Record<PhaseKey, string> = {
  base: "基础期（一般准备）",
  build: "强化期（专项力量）",
  specific: "专项期（模拟考试）",
  taper: "赛前调整",
};

const PROGRESSION: Record<PhaseKey, string> = {
  base: "周内推进：第 1 周用强度下限“适应”，第 2-3 周在动作标准前提下小幅加量/加重（每周训练总量增幅不超过 10%），最后一周略减量并做一次小测验，为进入强化期恢复。",
  build: "周内推进：第 1 周中等量找状态，第 2-3 周把强度和量推到本阶段峰值，最后一周减量 20-30% 并做阶段测验，带着好状态进入专项期。",
  specific: "周内推进：保持高强度但总量受控；每周安排一次轮换测验（100m/三级跳/铅球取两项）。若连续两周成绩平台，先检查恢复与睡眠，而非盲目加量。",
  taper: "减量但不减强度：每次课总量约为平时的 50-60%，强度保持 90-100%；只做高质量刺激，充分睡眠与恢复，避免新动作与陌生强度。",
};

const SAFETY: string[] = [
  "所有大强度跑、跳前必须完成充分热身（15 分钟以上），训练结束做整理放松。",
  "遵循“渐进超负荷”：每周总量或强度增幅不超过 10%，宁少勿伤。",
  "膝、踝、腰、跟腱出现疼痛时立即停止相关练习并向教练报告，不要“忍痛训练”。",
  "力量训练务必保证动作规范与保护；无把握的高翻等动作先用替代动作或轻重量。",
  "速度与跳跃大强度课之间至少间隔 48 小时；力量课次日避免安排同肌群大强度跳跃。",
  "保证睡眠 7-9 小时与足量碳水/蛋白质摄入，恢复与训练同等重要。",
];

const BASIS: string[] = [
  "周期化训练：按“基础期→强化期→专项期→赛前调整”由考试日期倒推安排，符合现代周期训练（Bompa 式周期 + 板块化安排）的基本原则。",
  "一周内速度、跳跃、力量、投掷按“神经疲劳”错开：速度/跳跃大强度课分散在周一、三、四/六，力量课穿插，保证每类素质每周 1-2 次高质量刺激。",
  "三个考试项目同周覆盖：100 米练速度与后程，三级跳练单跳爆发与三跳衔接，铅球练全身力量与用力顺序，避免“练一项丢一项”。",
  "每阶段末安排小测验复测，用数据决定下一阶段侧重（弱项优先、优势保持），而不是凭感觉加量。",
  "训练量参考：高中体育生每周 4-6 练、每次 70-120 分钟为宜；与文化课冲突时优先保证速度/跳跃关键课，可压缩力量课但不要整周停练。",
];

const REASSESSMENT: string[] = [
  "每个阶段结束做一次小测验：30 米、立定跳远、后抛实心球（约 20 分钟），数据录入系统用于下一周期自动调整。",
  "专项期改为每周轮测主项（100m/三级跳/铅球取两项），监控趋势而非单次波动。",
  "若某项连续两次测验无进步：优先复查技术录像与恢复情况，其次才是加量。",
  "考前 10-14 天做一次三项全真模拟，按考试顺序与间隔完整走一遍流程。",
];

export function buildPlanDoc(req: PlanRequest, opts: BuildPlanOptions): PlanDoc {
  const diag: DiagnosisResult = diagnose(req);
  const weakKey = topWeakKey(diag.focus);
  const realWeeks = weeksUntil(req.student.examDate);
  const totalWeeks = realWeeks !== null && realWeeks > 0 ? realWeeks : 12;
  const phases = planPhases(totalWeeks);

  const periods: PeriodDoc[] = phases.map((p) => ({
    key: p.key,
    name: p.name,
    weeks: p.weeks,
    goal: phaseGoalText(p.key),
    principles: [],
    progression: PROGRESSION[p.key],
    weeklySchedule: buildWeekSchedule({ phase: p.key, daysPerWeek: opts.daysPerWeek, weakKey }),
  }));

  const calendar: PlanDoc["calendar"] = [];
  let weekNum = 1;
  for (const p of phases) {
    for (let w = 0; w < p.weeks; w++) {
      calendar.push({ week: weekNum, phaseKey: p.key, phaseName: p.name, note: w === 0 ? "阶段开始，做阶段测验/基线记录" : w === p.weeks - 1 ? "阶段末，减量并复测" : "按周模板推进，强度按阶段说明爬坡" });
      weekNum++;
    }
  }

  const advice: string[] = [];
  advice.push(...diag.summaryLines);
  const weakNames: Record<string, string> = {
    accel: "起跑加速", maxSpeed: "最大速度", speedEnd: "后程/速度耐力", jumpPower: "下肢爆发力",
    jumpTech: "三级跳技术衔接", throwPower: "投掷爆发力", throwTech: "铅球用力顺序", strength: "基础力量", core: "核心力量",
  };
  advice.push(`本期训练的个人短板重点：${weakNames[weakKey] ?? "核心力量"}。每周${opts.daysPerWeek}练，已把对应补强内容放进课表。`);
  if (realWeeks === null) {
    advice.push("注意：尚未设置考试日期，当前按 12 周默认周期生成。建议在“档案”中填入目标考试日期，系统会按倒推自动重排阶段。");
  } else if (realWeeks <= 5) {
    advice.push(`距考试仅约 ${realWeeks} 周：此时以“专项冲刺 + 赛前调整”为主，不要再追求大运动量，重点是技术稳定性与状态调整。`);
  } else if (realWeeks >= 20) {
    advice.push(`距考试约 ${realWeeks} 周，时间充裕：前 1/3 请扎实打基础（技术+一般力量），避免过早进入高强度导致后期平台或伤病。`);
  } else {
    advice.push(`距考试约 ${realWeeks} 周，按 ${phases.map((x) => `${x.name}${x.weeks}周`).join("→")} 的节奏推进。`);
  }

  return {
    version: 1,
    meta: {
      generatedAt: new Date().toISOString(),
      weeksToExam: realWeeks,
      daysPerWeek: opts.daysPerWeek,
      mode: "rule",
      examDate: req.student.examDate,
      title: `${req.student.name} · 体育高考周期训练计划`,
      coachAdvice: advice,
      basis: BASIS,
    },
    diagnosis: {
      summaryLines: diag.summaryLines,
      findings: diag.findings.filter((x) => x.severity !== "low").length ? diag.findings.filter((x) => x.severity !== "low") : diag.findings,
    },
    calendar,
    periods,
    safety: SAFETY,
    reassessment: REASSESSMENT,
  };
}
