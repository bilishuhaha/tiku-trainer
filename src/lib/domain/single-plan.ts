// 单招专项计划生成器：仅覆盖 100 米（短跑）+ 急行跳远（助跑跳远），不含铅球/三级跳。
import { planPhases } from "./plan";
import { phaseGoalText } from "./sessions";
import { weeksUntil } from "../format";
import type { BlockDoc, DayDoc, ExerciseDoc, PeriodDoc, PhaseKey, PlanDoc } from "./types";

interface Input {
  name: string;
  gender: "male" | "female";
  examDate: string | null;
  injuryNote: string | null;
  latest: Record<string, { value: number; date: string }>;
  daysPerWeek: number;
}

function pick<T>(phase: PhaseKey, m: Record<PhaseKey, T>): T {
  return m[phase];
}
function ex(name: string, dose: string, intensity: string, rest: string, cue: string): ExerciseDoc {
  return { name, dose, intensity, rest, cue };
}

function warmup(): BlockDoc {
  return {
    kind: "warmup",
    label: "准备活动（约 18-20 分钟）",
    items: [
      ex("慢跑", "800-1200 米", "轻松微出汗", "-", "由慢到快，身体发热"),
      ex("行进间动态拉伸", "每项 2×15-20 米", "低", "-", "抱膝走、弓步转体、后踢腿、马克操"),
      ex("短距离加速跑", "3×40 米", "60%→80%→90%", "-", "放松技术，不计时"),
    ],
  };
}
function cooldown(): BlockDoc {
  return {
    kind: "cooldown",
    label: "整理放松（约 10 分钟）",
    items: [
      ex("放松慢跑/快走", "600-800 米", "轻松", "-", "心率回落"),
      ex("静态拉伸", "每侧 2×20-30 秒", "低", "-", "腘绳肌、髂腰肌、小腿、臀肌"),
      ex("训练日志", "1 分钟", "-", "-", "记录 RPE 与身体反应，供教练微调"),
    ],
  };
}

type Role = "speed" | "jump" | "power" | "speedEnd" | "tech" | "recovery";

const ROLE_BY_K: Record<number, Role[]> = {
  4: ["speed", "jump", "power", "speedEnd"],
  5: ["speed", "jump", "power", "speedEnd", "recovery"],
  6: ["speed", "jump", "power", "speedEnd", "tech", "recovery"],
};

const ROLE_TITLES: Record<Role, Record<PhaseKey, string>> = {
  speed: {
    base: "100米技术 + 起跑加速（基础）",
    build: "速度课：加速/最大速度",
    specific: "速度质量课（接近全力）",
    taper: "速度刺激 + 技术巩固",
  },
  jump: {
    base: "急行跳远：助跑与起跳（基础）",
    build: "跳远专项：节奏 + 完整技术",
    specific: "跳远专项（丈量 + 技术稳定）",
    taper: "跳远：短程完整技术",
  },
  power: {
    base: "下肢力量与基础爆发",
    build: "力量与爆发（专项期转化）",
    specific: "保持力量储备 + 轻快爆发",
    taper: "力量刺激（减量）",
  },
  speedEnd: {
    base: "速度耐力与跑量基础",
    build: "速度耐力 + 后程能力",
    specific: "专项耐力（百米后程/200 节奏）",
    taper: "轻量跑与放松恢复",
  },
  tech: {
    base: "技术细节与动作录像",
    build: "技术精修 + 弱点补强",
    specific: "赛前技术微调",
    taper: "轻技术保持",
  },
  recovery: {
    base: "积极恢复与拉伸",
    build: "积极恢复与拉伸",
    specific: "恢复与状态调整",
    taper: "主动恢复",
  },
};

function mainItems(role: Role, phase: PhaseKey): ExerciseDoc[] {
  if (role === "speed") {
    return pick(phase, {
      base: [
        ex("站立式起跑 30 米", "6×30 米", "85-90%", "组间 2-3 分钟", "前三步快速扒地，摆臂不僵"),
        ex("大步幅放松跑 60 米", "4×60 米", "80%", "组间 2 分钟", "送髋+放松大步"),
        ex("上坡跑 30-40 米", "5 次", "85-90%", "走回坡底", "强化蹬伸；无坡用阻力带"),
      ],
      build: [
        ex("站立式起跑 30 米（计时）", "6×30 米", "95-100%", "组间 3-4 分钟", "全力但动作不变形"),
        ex("行进间 40 米（最大速度）", "4×40 米", "100%", "组间 3-4 分钟", "先加速到最快再保持"),
        ex("100 米技术型全程", "2×100 米", "90-95%", "组间 6-8 分钟", "节奏分配、放松后程"),
      ],
      specific: [
        ex("起跑 30 米（计时）", "4×30 米", "100%", "组间 4-5 分钟", "一次成型"),
        ex("行进间 40 米", "3×40 米", "100%", "组间 4-5 分钟", "保持步频步幅"),
        ex("100 米模拟跑", "2×100 米", "95-100%", "组间 6-8 分钟", "全流程节奏"),
      ],
      taper: [
        ex("站立式起跑 30 米", "3×30 米", "95%", "组间 4 分钟", "保持神经兴奋"),
        ex("60 米放松大步", "2×60 米", "90%", "组间 4 分钟", "找快而松"),
      ],
    });
  }
  if (role === "jump") {
    return pick(phase, {
      base: [
        ex("助跑节奏跑（8-12 步）", "6 次", "放松中速", "走回", "步点稳定、节奏均匀，先不跳"),
        ex("起跳腿单足小跳 + 换腿跳", "每侧 3×6 次", "中", "组间 90 秒", "体会起跳腿蹬伸与摆动腿前送"),
        ex("3-5 步短助跑起跳 + 落地", "6 次", "70-80%", "组间 2 分钟", "踏板起跳，腾空后两腿前伸落地"),
      ],
      build: [
        ex("8-12 步助跑完整跳远", "6 次", "90-95%", "组间 2-3 分钟", "助跑不减速、上板有力"),
        ex("踏板起跳分解（6 步）", "6 次", "技术为主", "组间 2 分钟", "最后三步节奏：大-小-快"),
        ex("立定跳远（监控）", "4 次取最好", "90%", "组间 2 分钟", "作为爆发力指标"),
      ],
      specific: [
        ex("全程助跑完整跳（丈量）", "6 次", "95-100%", "组间 3 分钟", "记录成绩，稳定技术"),
        ex("助跑节奏 + 踏板组合", "6 次", "100%", "组间 2 分钟", "最后一步不减速"),
        ex("半程技术跳（6-8 步）", "4 次", "95%", "组间 2-3 分钟", "只练腾空与落地"),
      ],
      taper: [
        ex("短程（8 步）完整跳", "4 次", "95%", "组间 3 分钟", "高质量刺激，不过量"),
      ],
    });
  }
  if (role === "power") {
    return pick(phase, {
      base: [
        ex("杠铃深蹲（颈后）", "5×8-10 次", "70-75% 1RM", "组间 2-3 分钟", "动作规范，蹲至大腿平行"),
        ex("罗马尼亚硬拉", "4×8 次", "中等", "组间 2 分钟", "髋主导，腘绳肌有张力"),
        ex("保加利亚分腿蹲", "每侧 3×8 次", "中", "组间 90 秒", "前腿主导"),
      ],
      build: [
        ex("杠铃深蹲", "5×5 次", "80-85% 1RM", "组间 3 分钟", "保持刚性，不强求力竭"),
        ex("罗马尼亚硬拉", "4×6 次", "80%", "组间 2-3 分钟", "爆发伸髋"),
        ex("蹲跳（不负重/轻负重）", "3×5 次", "快速", "组间 2 分钟", "落地立刻再跳"),
      ],
      specific: [
        ex("杠铃深蹲", "4×3-5 次", "85-90%", "组间 3-4 分钟", "保持力量储备"),
        ex("高拉/爆发类", "4×4 次", "75-85% 快", "组间 2-3 分钟", "伸髋爆发、贴身"),
      ],
      taper: [
        ex("杠铃深蹲", "3×3 次", "85%", "组间 3-4 分钟", "轻量刺激"),
        ex("轻快蹲跳", "2×4 次", "轻", "组间 2 分钟", "找弹性"),
      ],
    });
  }
  if (role === "speedEnd") {
    return pick(phase, {
      base: [
        ex("变速跑 60+40 米", "4 组", "快 90%/慢 60%", "组间 2 分钟", "发展加速与恢复"),
        ex("150 米放松跑", "3×150 米", "85%", "组间 3 分钟", "摆臂放松、节奏稳定"),
      ],
      build: [
        ex("150 米计时跑", "3×150 米", "90-95%", "组间 4 分钟", "后 30 米不降速"),
        ex("200 米节奏跑", "2×200 米", "90%", "组间 5 分钟", "练习后程分配"),
      ],
      specific: [
        ex("150 米 + 30 米冲刺组合", "3 组", "95%", "组间 4-5 分钟", "模拟百米后程加冲刺"),
        ex("下坡顺风加速跑（可选）", "3×60 米", "高步频", "组间 3 分钟", "体会高频，无坡可省"),
      ],
      taper: [
        ex("轻快 100 米放松跑", "3×100 米", "85%", "组间 3 分钟", "只求放松"),
      ],
    });
  }
  if (role === "tech") {
    return pick(phase, {
      base: [
        ex("马克操 + 摆臂分解", "各 3 组", "低-中", "-", "建立正确技术模型"),
        ex("助跑步点丈量与标记", "10 次", "放松", "-", "找到稳定起跳点"),
      ],
      build: [
        ex("起跑器/站立式起跑分解", "8 次", "90%", "组间 2 分钟", "反应 + 前三步"),
        ex("跳远腾空与落地练习（沙坑）", "8 次", "中", "组间 1 分钟", "收腿前伸，防止后坐"),
      ],
      specific: [
        ex("全程技术录像对照练习", "按需", "95%", "-", "一次一个要点"),
        ex("起跳腿强化小跳", "每侧 4×8 次", "中-高", "组间 1 分钟", "最后冲刺阶段保持弹性"),
      ],
      taper: [
        ex("轻技术操与步点巩固", "15 分钟", "低", "-", "保持感觉即可"),
      ],
    });
  }
  // recovery
  return pick(phase, {
    base: [
      ex("慢跑 + 拉伸", "20-30 分钟", "轻松", "-", "主动恢复"),
      ex("泡沫轴/拉伸重点", "10 分钟", "低", "-", "腘绳肌、小腿、髂腰肌"),
    ],
    build: [
      ex("慢跑 + 拉伸", "20-30 分钟", "轻松", "-", "排酸放松"),
      ex("核心与稳定性（轻）", "10 分钟", "低-中", "-", "平板、臀桥、侧桥"),
    ],
    specific: [
      ex("慢跑 + 动态拉伸", "20 分钟", "轻松", "-", "保持身体热度"),
      ex("放松整理", "10 分钟", "低", "-", "不做疲劳积累"),
    ],
    taper: [
      ex("慢跑/快走 + 拉伸", "15-20 分钟", "轻松", "-", "减量不减睡眠"),
    ],
  });
}

function dayBlock(role: Role, phase: PhaseKey, day: number, minutes: number, extra?: string): DayDoc {
  const techNotes =
    role === "jump"
      ? pick(phase, {
          base: ["急行跳远技术顺序：稳定助跑节奏 → 最后三步缩短加快 → 踏板起跳 → 腾空 → 落地前伸。"],
          build: ["注意：助跑最后一步不要减速“顿”一下，要顺势上板；起跳腿充分蹬伸、摆动腿前送。"],
          specific: ["专项期以“稳定成绩”为主：每次记录成绩，连续两次无进步先查助跑节奏与恢复，不要盲目加量。"],
          taper: ["赛前跳远只做高质量短程技术，避免疲劳堆积与陌生强度。"],
        })
      : role === "speed"
        ? pick(phase, {
            base: ["百米技术要点：起跑前倾逐步抬起，摆臂以肩为轴，脚落地在重心下方稍前。"],
            build: ["途中跑保持躯干直立放松，后程靠“放松大步”维持速度。"],
            specific: ["速度课宁可少两组，也要每组接近个人最好；起跑一次成型。"],
            taper: ["只刺激不消耗：强度高、量小、恢复长。"],
          })
        : [];
  return {
    day,
    title: ROLE_TITLES[role][phase] + (extra ?? ""),
    durationMin: minutes,
    blocks: [
      warmup(),
      {
        kind: "main",
        label: role === "speed" ? "主课：百米相关速度训练" : role === "jump" ? "主课：急行跳远训练" : role === "power" ? "主课：力量与爆发" : role === "speedEnd" ? "主课：速度耐力/后程" : "主课：恢复与技术",
        items: mainItems(role, phase),
      },
      cooldown(),
    ],
    techNotes,
  };
}

const PROGRESSION: Record<PhaseKey, string> = {
  base: "第 1 周适应、以技术为主；第 2-3 周在动作标准前提下小幅加量，每周总量增幅≤10%；阶段末做一次基线测验。",
  build: "第 1 周中等量找状态，第 2-3 周强度与量推至阶段峰值，最后一周减量 20-30% 并测验。",
  specific: "保持高强度但总量受控；百米与跳远每周至少各一次高质量专项，连续两周无进步先查恢复与睡眠。",
  taper: "减量不减强度：单课总量约为平时 50-60%，强度保持 90-100%，充分睡眠恢复，避免新动作。",
};

export function buildSinglePlanDoc(input: Input): PlanDoc {
  const k = input.daysPerWeek === 4 || input.daysPerWeek === 5 || input.daysPerWeek === 6 ? input.daysPerWeek : 6;
  const realWeeks = weeksUntil(input.examDate);
  const totalWeeks = realWeeks !== null && realWeeks > 0 ? realWeeks : 12;
  const phases = planPhases(totalWeeks);

  const periods: PeriodDoc[] = phases.map((p) => ({
    key: p.key,
    name: p.name,
    weeks: p.weeks,
    goal: phaseGoalText(p.key),
    principles: [],
    progression: PROGRESSION[p.key],
    weeklySchedule: (ROLE_BY_K[k] ?? ROLE_BY_K[6]).map((role, idx) =>
      dayBlock(role, p.key, idx + 1, pick(p.key, { base: 95, build: 105, specific: 100, taper: 75 })),
    ),
  }));

  const calendar: PlanDoc["calendar"] = [];
  let wn = 1;
  for (const p of phases) {
    for (let w = 0; w < p.weeks; w++) {
      calendar.push({ week: wn, phaseKey: p.key, phaseName: p.name, note: w === 0 ? "阶段开始，做基线测验/记录" : w === p.weeks - 1 ? "阶段末，减量并复测" : "按周模板推进" });
      wn++;
    }
  }

  const advice: string[] = [];
  const s100 = input.latest["sprint100"];
  const rj = input.latest["runLongJump"];
  advice.push(`单招项目：100 米 + 急行跳远（助跑跳远），不含铅球。每周 ${k} 练。`);
  if (s100) advice.push(`当前 100 米成绩约 ${s100.value.toFixed(2)} 秒（${s100.date}），速度课会以它为核心安排。`);
  if (rj) advice.push(`当前急行跳远约 ${rj.value.toFixed(2)} 米（${rj.date}），跳远课按“助跑节奏-踏板-起跳-腾空落地”逐项打磨。`);
  if (!s100 && !rj) advice.push("尚未录入成绩：建议先测 100 米与急行跳远各一次，录入后系统会自动按弱项调整侧重。");
  if (realWeeks === null) advice.push("未设考试日期，当前按 12 周默认周期生成；建议在档案填目标考试日期以自动倒推。");
  if (input.injuryNote) advice.push(`学生自述需注意：${input.injuryNote}。相关训练请减量或暂缓，疼痛即停。`);

  return {
    version: 1,
    meta: {
      generatedAt: new Date().toISOString(),
      weeksToExam: realWeeks,
      daysPerWeek: k,
      mode: "rule",
      program: "single",
      examDate: input.examDate,
      title: `${input.name} · 单招专项（100米+急行跳远）训练计划`,
      coachAdvice: advice,
      basis: [
        "按周期训练思想（基础→强化→专项→赛前）由考试日期倒推安排。",
        "一周内速度、跳远专项、力量按神经疲劳错开，保证每类素质每周 1-2 次高质量刺激。",
        "急行跳远以“助跑节奏稳定 + 踏板技术 + 起跳爆发”为主线，百米以“起跑加速+途中放松+后程”为主线。",
        "阶段末小测验复测，用数据决定下一阶段侧重。",
      ],
    },
    diagnosis: {
      summaryLines: advice.slice(),
      findings: [],
    },
    calendar,
    periods,
    safety: [
      "大强度跑/跳前充分热身 15 分钟以上；疼痛立即停止并向教练报告。",
      "助跑跳远请在有沙坑或软垫处练习，落地前两腿前伸，防止后坐受伤。",
      "速度与跳跃大强度课间隔至少 48 小时。",
    ],
    reassessment: [
      "每阶段末测验：100 米、急行跳远各一次，数据录入系统供下一周期调整。",
      "考前 10-14 天做一次两项全真模拟。",
    ],
  };
}
