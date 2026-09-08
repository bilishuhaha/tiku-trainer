// 单招专项计划生成器（专项化精修版）
// 覆盖：100 米（短跑）+ 急行跳远（助跑跳远）。
// 理论框架参考：
//  - 美国田径协会（USATF）教练员教育体系的“分项技术模型”（短跑：起跑/加速 → 途中最大速度 → 速度耐力；
//    跳远：助跑 → 起跳 → 腾空 → 落地）与训练分期（准备期 → 竞赛期 → 过渡/赛前调整）；
//  - 周期化训练（基础-强化-专项-赛前）+ 板块化安排；
//  - 力量-速度连续体 / 对比（contrast）与激活后增强（PAP）；
//  - 渐进超负荷、超量恢复、减量（tapering）、专项化与个体化诊断；
//  - RAMP 热身（Raise 提升 / Activate 激活 / Mobilise 动员 / Potentiate 强化）、动作学习与即时反馈。
// 免责：本项目为体育高考/单招备考工具，通用原则仅供参考，不能替代持证教练现场判断。
import { planPhases } from "./plan";
import { weeksUntil } from "../format";
import type { BlockDoc, DayDoc, ExerciseDoc, Finding, PeriodDoc, PhaseKey, PlanDoc, Severity } from "./types";
import type { SingleEvents } from "./types";

interface Input {
  name: string;
  gender: "male" | "female";
  examDate: string | null;
  injuryNote: string | null;
  latest: Record<string, { value: number; date: string }>;
  daysPerWeek: number;
  /** 单招项目：sprint=百米 / longJump=急行跳远 / both=两项都练（默认） */
  events?: SingleEvents;
}

function pick<T>(phase: PhaseKey, m: Record<PhaseKey, T>): T {
  return m[phase];
}
function ex(name: string, dose: string, intensity: string, rest: string, cue: string): ExerciseDoc {
  return { name, dose, intensity, rest, cue };
}
function f(sev: Severity, title: string, detail: string, advice: string): Finding {
  return { severity: sev, title, detail, advice, event: "general" };
}

// ============ 专项短板诊断（用已有成绩：100米 + 30米/60米分段 + 立定跳远等） ============
type SpeedFocus = "accel" | "maxSpeed" | "speedEnd" | "balanced" | "unknown";
type JumpPower = "low" | "ok" | "unknown";

interface SingleAnalysis {
  speedFocus: SpeedFocus;
  jumpPower: JumpPower;
  notes: string[];
  findings: Finding[];
}

function analyzeSingle(input: Input): SingleAnalysis {
  const L = input.latest;
  const num = (k: string): number | null => (L[k]?.value ?? null);
  const s100 = num("sprint100");
  const s30 = num("sprint30");
  const s60 = num("sprint60");
  const slj = num("standingLongJump"); // 立定跳远：水平爆发力监控
  const rjRec = L["runLongJump"] ?? null;
  const notes: string[] = [];
  const findings: Finding[] = [];
  let speedFocus: SpeedFocus = "balanced";
  let jumpPower: JumpPower = "unknown";

  // —— 短跑分段定位（30m/100m、60m/100m 为经验参考比例，非官方标准）——
  if (s100 !== null) {
    const r30 = s30 !== null ? s30 / s100 : null;
    const r60 = s60 !== null ? s60 / s100 : null;
    if (r30 !== null && r30 > 0.385) {
      speedFocus = "accel";
      findings.push(f(r30 > 0.41 ? "high" : "medium", "100米短板偏“起跑加速”", `30m/100m=${(r30 * 100).toFixed(1)}%（训练较好学生约 35-38%，经验参考）`, "速度课加大站立式起跑、30m 爆发加速与反应练习比重，配合下肢快速力量。"));
    } else if (r60 !== null && r60 > 0.665) {
      speedFocus = "accel";
      findings.push(f("medium", "前 60 米占比偏高，加速衔接有提升空间", `60m/100m=${(r60 * 100).toFixed(1)}%（经验参考约 63-66%）`, "强化 30-60m 加速与途中跑衔接，多做站立式起跑接放松途中跑。"));
    } else if (r30 !== null && r30 < 0.345) {
      speedFocus = "maxSpeed";
      findings.push(f("medium", "前段不错，途中最大速度是主要提升点", `30m/100m=${(r30 * 100).toFixed(1)}% 偏低`, "速度课向 40-80m 行进间最大速度与放松大步转移。"));
    } else if (r60 !== null && r60 < 0.625) {
      speedFocus = "speedEnd";
      findings.push(f("medium", "后 40 米掉速相对明显", `60m/100m=${(r60 * 100).toFixed(1)}% 偏低`, "每周加 1 次速度耐力/后程课（120-150m 重复跑），强调后程放松与步幅保持。"));
    } else if (s30 === null && s60 === null) {
      speedFocus = "unknown";
      notes.push("只有 100 米成绩：建议同场加测 30m 与 60m，才能把“起跑加速 / 途中速度 / 后程”分开定位（USATF 分段诊断思路）。");
    }
  }

  // —— 跳远/爆发力参考（立定跳远为水平跳跃能力监控项）——
  if (slj !== null) {
    const ref = input.gender === "male" ? { low: 2.35, ok: 2.55 } : { low: 1.85, ok: 2.0 };
    if (slj < ref.low) {
      jumpPower = "low";
      findings.push(f("medium", "下肢水平爆发力基础偏弱", `立定跳远 ${slj.toFixed(2)}m（经验参考：男≈2.35-2.55m / 女≈1.85-2.0m）`, "力量与跳跃课优先堆“下肢最大力量+快速伸缩复合（跳深/连续跳）+短程助跑起跳”，再谈完整技术。"));
    } else if (slj >= ref.ok) {
      jumpPower = "ok";
      notes.push(`立定跳远 ${slj.toFixed(2)}m，水平爆发力基础不错：跳远课重心放在“助跑-上板”的转化与腾空落地技术，把素质变成距离。`);
    }
  } else {
    notes.push("缺立定跳远数据：建议补测作为水平爆发力监控项（USATF 常用“立定跳远→跳远成绩”的经验监控）。");
  }

  if (rjRec !== null) {
    notes.push(`当前急行跳远约 ${rjRec.value.toFixed(2)} 米（${rjRec.date}），跳远课围绕“助跑节奏-上板-起跳-腾空-落地”逐环节打磨。`);
  }
  if (s100 === null && slj === null && rjRec === null) {
    notes.push("尚无最近成绩：建议先按下面“测验包”测一次（30m、60m、立定跳远、100米、急行跳远），录入后系统会自动细化短板侧重。");
  }
  return { speedFocus, jumpPower, notes, findings };
}

// ============ 通用热身（RAMP 结构）/ 整理放松 ============
function warmup(jumpDay = false): BlockDoc {
  const items: ExerciseDoc[] = [
    ex("慢跑或单车", "6-10 分钟", "轻松微出汗", "-", "RAMP-Raise：逐步提升心率与体温"),
    ex("行进间动态拉伸", "每项 2×15-20 米", "低", "-", "抱膝走、弓步转体、后踢腿、直腿前踢、侧向交叉步"),
    ex("马克操 A/B、车轮跑", "2×20-30 米", "低-中", "-", "短跑技术操：脚掌弹性与摆臂"),
    ex("加速跑（由慢到快）", "3×40 米", "60%→80%→90%", "走回", "放松技术，最后一步接近途中跑姿态"),
    ex("激活：臀桥/侧桥/肩胛俯卧撑", "各 1-2 组", "低", "-", "RAMP-Activate：激活臀、核心与肩带"),
  ];
  if (jumpDay) {
    items.push(ex("轻跳预刺激（跳绳/小跳）", "2×8-10 次", "低-中", "组间 60 秒", "RAMP-Potentiate：提前唤醒踝-腱弹性，再进主课"));
  }
  return { kind: "warmup", label: "准备活动 RAMP（约 20 分钟）", items };
}
function cooldown(): BlockDoc {
  return {
    kind: "cooldown",
    label: "整理放松（约 10 分钟）",
    items: [
      ex("放松慢跑/快走", "600-800 米", "轻松", "-", "让心率缓慢回落"),
      ex("静态拉伸", "每侧 2×20-30 秒", "低", "-", "腘绳肌、髂腰肌、股四头肌、小腿、臀肌"),
      ex("自我按摩/泡沫轴（可选）", "5 分钟", "低", "-", "重点：小腿三头肌、腘绳肌、髋屈肌"),
      ex("训练日志", "1 分钟", "-", "-", "记录本节课 RPE（6-20）与身体反应，供教练微调"),
    ],
  };
}

// ============ 每周课型（针对两项主项的“专项化”组合） ============
type Role = "speed" | "jump" | "power" | "speedEnd" | "tech" | "recovery";

// 4 练：速度、跳远、力量爆发、速度耐力（保两项主项）
// 5 练：+ 技术精修（含恢复元素）
// 6 练：+ 跳远第二技术课/落地课 + 主动恢复
const ROLE_BY_K: Record<number, RolePlus[]> = {
  4: ["speed", "jump", "power", "speedEnd"],
  5: ["speed", "jump", "power", "speedEnd", "tech"],
  6: ["speed", "jump", "power", "speedEnd", "jumpTech", "recovery"],
};
type RolePlus = Role | "jumpTech";

// —— 单招项目聚焦：按所选项目决定每周课型组合 ——
// sprint（百米单招）：速度课×2 + 速度耐力 + 力量爆发(+技术/恢复)，不设急行跳远技术主课
// longJump（急行跳远单招）：跳远技术 + 跳远分解 + 助跑速度/短冲 + 力量爆发(+恢复)，不设 100 米后程速度耐力课
// both（两项都练）：沿用上方 ROLE_BY_K 的组合
const SPRINT_TECH: Record<PhaseKey, ExerciseDoc[]> = {
  base: [
    ex("马克操 + 摆臂分解", "各 3 组", "低-中", "-", "建立短跑技术模型：摆臂、脚掌落地、躯干姿态"),
    ex("起跑器/站立式起跑分解", "8 次", "90%", "组间 2 分钟", "反应 + 前三步，力量方向向前向下"),
    ex("途中跑姿势练习（放松大步）", "4×60 米", "80%", "组间 2 分钟", "送髋、脚掌落地、摆臂以肩为轴"),
    ex("录像对照：一次只改一个要点", "按需", "-", "-", "USATF：即时反馈修正动作模型"),
  ],
  build: [
    ex("站立式起跑 30 米（技术计时）", "6×30 米", "95%", "组间 3 分钟", "专注前 3-6 步爆发与逐步抬身"),
    ex("行进间 40 米（最大速度）", "4×40 米", "100%", "组间 3-4 分钟", "体会“快而松”，不僵硬"),
    ex("60 米技术计时", "3×60 米", "90-95%", "组间 4 分钟", "加速→途中衔接，后程保持放松"),
    ex("听信号起跑出发（反应）", "6 次", "95%", "组间 2 分钟", "出发节奏固定，不抢不慢"),
  ],
  specific: [
    ex("起跑 30 米（计时）", "4×30 米", "100%", "组间 4-5 分钟", "一次成型，模拟考试"),
    ex("100 米全程（技术型）", "2×100 米", "95-100%", "组间 6-8 分钟", "节奏分配 + 放松后程，记录成绩"),
    ex("录像节奏核对", "按需", "-", "-", "看分段衔接，找后程掉速原因"),
  ],
  taper: [
    ex("轻技术操 + 摆臂分解", "10 分钟", "低", "-", "保持神经-肌肉连接，不疲劳"),
    ex("60 米放松大步跑", "2×60 米", "90%", "组间 4 分钟", "找“快而松”的感觉"),
  ],
};

// 百米单招下，“技术课”定位为百米技术精修（衔接/放松/送髋）
const SPRINT_TECH_TITLE: Record<PhaseKey, string> = {
  base: "百米 · 技术精修（摆臂/落点/姿态）",
  build: "百米 · 技术精修（衔接/放松/送髋）",
  specific: "百米 · 技术巩固（录像微调）",
  taper: "百米 · 轻技术保持",
};

// 跳远单招下，“速度课”定位为助跑速度/短冲（非 100 米比赛课）
const LONGJUMP_SPEED_TITLE: Record<PhaseKey, string> = {
  base: "急行跳远 · 助跑速度（短冲加速）",
  build: "急行跳远 · 助跑速度（短冲，节奏渐快）",
  specific: "急行跳远 · 助跑速度质量课（接近考试）",
  taper: "急行跳远 · 助跑速度刺激（减量）",
};

function rolesFor(events: SingleEvents, k: number): RolePlus[] {
  if (events === "sprint") {
    const m: Record<number, RolePlus[]> = {
      4: ["speed", "power", "speedEnd", "speed"],
      5: ["speed", "power", "speedEnd", "speed", "tech"],
      6: ["speed", "power", "speedEnd", "speed", "tech", "recovery"],
    };
    return m[k] ?? m[6];
  }
  if (events === "longJump") {
    const m: Record<number, RolePlus[]> = {
      4: ["jump", "power", "speed", "jumpTech"],
      5: ["jump", "power", "speed", "jumpTech", "speed"],
      6: ["jump", "power", "speed", "jumpTech", "speed", "recovery"],
    };
    return m[k] ?? m[6];
  }
  return ROLE_BY_K[k] ?? ROLE_BY_K[6];
}

const ROLE_TITLES: Record<RolePlus, Record<PhaseKey, string>> = {
  speed: {
    base: "100米 · 技术 + 起跑加速（一般准备）",
    build: "100米 · 加速与最大速度（专项转化）",
    specific: "100米 · 速度质量课（接近考试强度）",
    taper: "100米 · 速度刺激 + 技术巩固",
  },
  jump: {
    base: "急行跳远 · 助跑-起跳技术（基础）",
    build: "急行跳远 · 节奏 + 完整技术（专项）",
    specific: "急行跳远 · 全程丈量 + 技术稳定",
    taper: "急行跳远 · 短程高质量完整跳",
  },
  jumpTech: {
    base: "跳远分解 · 上板/腾空/落地",
    build: "跳远分解 · 最后三步节奏 + 腾空落地",
    specific: "跳远分解 · 全程节奏微调 + 录像对照",
    taper: "跳远分解 · 轻技术保持（不上强度）",
  },
  power: {
    base: "力量-速度基础：最大力量 + 落地缓冲",
    build: "力量-速度转化：力量 + 快速伸缩复合",
    specific: "保持力量储备 + 轻快爆发（对比课）",
    taper: "力量刺激（减量）：小量高强度",
  },
  speedEnd: {
    base: "速度耐力 + 跑量基础（特殊耐力Ⅰ）",
    build: "速度耐力 + 后程能力（特殊耐力Ⅰ/Ⅱ）",
    specific: "专项耐力：百米后程 + 200 节奏（转化）",
    taper: "轻量跑与放松（保持有氧底）",
  },
  tech: {
    base: "专项技术模型：分解 + 录像",
    build: "技术精修 + 本周短板补强",
    specific: "赛前技术微调（一次一个要点）",
    taper: "轻技术保持",
  },
  recovery: {
    base: "主动恢复 + 核心稳定 + 落地技术",
    build: "主动恢复 + 核心稳定",
    specific: "恢复与状态调整（减量期）",
    taper: "主动恢复（考前放松）",
  },
};

// ============ 主课内容（按阶段推进，专项化） ============
function mainItems(role: RolePlus, phase: PhaseKey, events: SingleEvents = "both"): ExerciseDoc[] {
  if (role === "speed") {
    return pick(phase, {
      base: [
        ex("站立式起跑 30 米", "6×30 米", "85-90%，动作质量优先", "组间 2-3 分钟", "前三步快速有力扒地，摆臂不僵，躯干前倾逐步抬起"),
        ex("大步幅放松跑 60 米", "4×60 米", "80%", "组间 2 分钟", "送髋+放松大步，找“快而松”"),
        ex("上坡跑 30-40 米（3-5%）", "5 次", "85-90%", "走回坡底", "强化蹬伸与高抬膝；无坡用阻力带替代"),
        ex("听信号反应起跑", "5 次", "专注反应", "组间 1 分钟", "USATF 速度模型第一步：反应+加速"),
      ],
      build: [
        ex("站立式起跑 30 米（计时）", "6×30 米", "95-100%", "组间 3-4 分钟", "全力但动作不变形，看趋势不拼单次"),
        ex("行进间 40 米（最大速度）", "4×40 米", "100%", "组间 3-4 分钟", "先加速到最快再保持，体会无减速"),
        ex("60 米计时跑", "3×60 米", "90-95%", "组间 4 分钟", "加速→途中衔接，后程不僵"),
      ],
      specific: [
        ex("起跑 30 米（计时）", "4×30 米", "100%", "组间 4-5 分钟", "一次成型，模拟考试节奏"),
        ex("行进间 40 米（最高速度）", "3×40 米", "100%", "组间 4-5 分钟", "保持步频步幅、躯干稳定"),
        ex("100 米全程（技术型）", "2×100 米", "95-100%", "组间 6-8 分钟", "节奏分配 + 放松后程，记录成绩"),
      ],
      taper: [
        ex("站立式起跑 30 米", "3×30 米", "95%", "组间 4 分钟", "保持神经兴奋度，不过量"),
        ex("60 米放松大步跑", "2×60 米", "90%", "组间 4 分钟", "找“快而松”的感觉"),
      ],
    });
  }
  if (role === "jump") {
    return pick(phase, {
      base: [
        ex("助跑节奏跑（8-12 步）", "6 次", "放松中速", "走回", "步点稳定、节奏均匀，先不跳（USATF：先跑后跳）"),
        ex("起跳腿单足小跳 + 换腿跳", "每侧 3×6 次", "中", "组间 90 秒", "体会起跳腿蹬伸与摆动腿前送"),
        ex("3-5 步短助跑起跳 + 落地", "6 次", "70-80%", "组间 2 分钟", "上板起跳，腾空两腿前伸落地（沙坑/软垫）"),
        ex("立定跳远（监控）", "3 次", "中-高", "组间 2 分钟", "作为水平爆发力基线记录"),
      ],
      build: [
        ex("8-12 步助跑完整跳远", "6 次", "90-95%", "组间 2-3 分钟", "助跑不减速、上板有力，丈量记录"),
        ex("踏板起跳分解（6 步）", "6 次", "技术为主", "组间 2 分钟", "最后三步节奏：大-小-快，上板不“顿”"),
        ex("立定跳远（丈量）", "4 次取最好", "90-95%", "组间 2 分钟", "监控爆发力变化"),
      ],
      specific: [
        ex("全程助跑完整跳（丈量）", "6 次", "95-100%", "组间 3 分钟", "记录成绩，重点是“稳定”而非每跳冒险"),
        ex("助跑节奏 + 上板组合", "6 次", "100%", "组间 2-3 分钟", "最后一步不减速、起跳腿快速下压"),
        ex("半程技术跳（6-8 步）", "4 次", "95%", "组间 2-3 分钟", "只打磨腾空与落地，保持技术模型"),
      ],
      taper: [
        ex("短程（8 步）完整跳", "4 次", "95%", "组间 3-4 分钟", "高质量刺激，量小恢复长"),
        ex("立定跳远", "3 次", "95%", "组间 3 分钟", "轻快完成，找弹性"),
      ],
    });
  }
  if (role === "jumpTech") {
    return pick(phase, {
      base: [
        ex("原地/上步起跳腿练习", "每侧 4×6 次", "技术", "组间 1 分钟", "起跳腿“扒-蹬-送”，摆动腿前送高抬"),
        ex("腾空“走步式”分解（沙坑）", "8 次", "技术", "组间 1 分钟", "空中换步与摆臂协调"),
        ex("落地缓冲练习（沙坑）", "8 次", "技术", "组间 1 分钟", "收腿前伸、重心前送，防后坐"),
      ],
      build: [
        ex("最后三步节奏标记跑 + 上板", "8 次", "90%", "组间 2 分钟", "用标志物练“大-小-快”，上板不减速"),
        ex("短程（6 步）完整跳", "6 次", "90-95%", "组间 2 分钟", "把分解节奏串成完整技术"),
        ex("跳深-起跳组合（30-40cm 跳箱）", "4×5 次", "快速", "组间 2 分钟", "落地立即起跳，缩短触地时间（PAP 思路）"),
      ],
      specific: [
        ex("全程助跑节奏核对", "6 次", "95%", "组间 2-3 分钟", "步点稳定，上板前最后一步不减速"),
        ex("录像对照：一次一个技术要点", "6 次", "95%", "组间 2 分钟", "USATF：录像即时反馈修正动作模型"),
        ex("跳深-起跳（保持弹性）", "3×5 次", "快速", "组间 2 分钟", "轻量保持，不积累疲劳"),
      ],
      taper: [
        ex("轻技术操 + 步点巩固", "15 分钟", "低", "-", "保持感觉即可，不疲劳"),
      ],
    });
  }
  if (role === "power") {
    return pick(phase, {
      base: [
        ex("杠铃深蹲（颈后）", "5×8-10 次", "70-75% 1RM 或 RPE 7", "组间 2-3 分钟", "动作规范第一：全脚掌、膝与脚尖同向"),
        ex("罗马尼亚硬拉", "4×8 次", "中等", "组间 2 分钟", "髋主导，腘绳肌有张力（短跑/跳远伸髋基础）"),
        ex("保加利亚分腿蹲", "每侧 3×8 次", "中", "组间 90 秒", "单腿力量：起跳腿/摆动腿均衡"),
        ex("站姿提踵", "3×15 次", "中-高", "组间 60 秒", "踝关节刚性，跑跳“扒地”基础"),
      ],
      build: [
        ex("杠铃深蹲", "5×5 次", "80-85% 1RM 或 RPE 8", "组间 3 分钟", "保持刚性，不做力竭组"),
        ex("罗马尼亚硬拉（爆发伸髋）", "4×6 次", "80%", "组间 2-3 分钟", "快速伸髋，感受“髋铰链”发力"),
        ex("蹲跳（轻负重/不负重）", "3×5 次", "快速爆发", "组间 2 分钟", "落地立即再跳（快速伸缩复合）"),
        ex("后抛实心球（2kg）", "6×3 组", "85-90%", "组间 2 分钟", "全身由下往上协调发力，辅助跳远摆动"),
      ],
      specific: [
        ex("杠铃深蹲", "4×3-5 次", "85-90%", "组间 3-4 分钟", "保持最大力量储备，不做力竭"),
        ex("高拉/硬拉类爆发", "4×4 次", "75-85% 快速", "组间 2-3 分钟", "伸髋爆发、杠铃贴身"),
        ex("对比组：深蹲 1×3 + 蹲跳 3 次", "3 轮", "高", "轮间 3 分钟", "力量-速度连续体：最大力量激活后接爆发（PAP）"),
      ],
      taper: [
        ex("杠铃深蹲", "3×3 次", "85%", "组间 3-4 分钟", "轻量刺激保持神经"),
        ex("轻快蹲跳", "2×4 次", "轻", "组间 2 分钟", "找弹性不找疲劳"),
      ],
    });
  }
  if (role === "speedEnd") {
    return pick(phase, {
      base: [
        ex("变速跑 60+40 米", "4 组", "快 90%/慢 60%", "组间 2 分钟", "发展加速-恢复能力（特殊耐力Ⅰ入门）"),
        ex("150 米放松节奏跑", "3×150 米", "85%", "组间 3 分钟", "摆臂放松、节奏稳定，最后 50 米不变形"),
      ],
      build: [
        ex("150 米计时跑", "3×150 米", "90-95%", "组间 4 分钟", "后 30 米不降速，“顶”的感觉"),
        ex("200 米节奏跑", "2×200 米", "90%", "组间 5 分钟", "练习后程能量分配（超主项距离转化）"),
      ],
      specific: [
        ex("150 米 + 30 米冲刺组合", "3 组", "95%", "组间 4-5 分钟", "模拟百米后程顶住 + 终点冲刺"),
        ex("下坡顺风加速跑（可选）", "3×60 米", "高步频", "组间 3 分钟", "超最大速度刺激，体会高频；无坡可省"),
      ],
      taper: [
        ex("轻快 100 米放松跑", "3×100 米", "85%", "组间 3 分钟", "只求放松与技术"),
      ],
    });
  }
  if (role === "tech") {
    if (events === "sprint") return pick(phase, SPRINT_TECH);
    return pick(phase, {
      base: [
        ex("马克操 + 摆臂分解", "各 3 组", "低-中", "-", "建立正确技术模型（USATF 教学顺序：先模型后强度）"),
        ex("助跑步点丈量与标记", "10 次", "放松", "-", "找到稳定起跳点（两脚标记+步点表）"),
        ex("短跑关键姿势练习", "3 组", "低-中", "-", "前倾角、脚掌落地位置、摆臂以肩为轴"),
      ],
      build: [
        ex("起跑器/站立式起跑分解", "8 次", "90%", "组间 2 分钟", "反应 + 前三步（力量方向：向前向下）"),
        ex("跳远腾空与落地练习（沙坑）", "8 次", "中", "组间 1 分钟", "收腿前伸，防止后坐"),
        ex("录像对照：短跑+跳远各 1 要点", "按需", "-", "-", "一次只改一个动作点，改对再叠加"),
      ],
      specific: [
        ex("全程技术录像对照练习", "按需", "95%", "-", "USATF：录像即时反馈，稳定技术模型"),
        ex("起跳腿强化小跳", "每侧 4×8 次", "中-高", "组间 1 分钟", "保持踝-腱弹性"),
      ],
      taper: [
        ex("轻技术操与步点巩固", "15 分钟", "低", "-", "保持感觉即可"),
      ],
    });
  }
  // recovery
  return pick(phase, {
    base: [
      ex("慢跑 + 拉伸", "20-30 分钟", "轻松", "-", "主动恢复，排酸放松"),
      ex("核心与稳定（轻）", "10 分钟", "低-中", "-", "平板、臀桥、侧桥、死虫式"),
      ex("落地缓冲技术复习（沙坑/垫上）", "5 次", "技术", "-", "安全落地：屈髋屈膝、重心前送"),
    ],
    build: [
      ex("慢跑 + 拉伸", "20-30 分钟", "轻松", "-", "恢复日不追求刺激"),
      ex("核心与稳定（中）", "12 分钟", "中", "-", "平板+侧桥+帕洛夫推（抗旋转）"),
      ex("泡沫轴重点放松", "10 分钟", "低", "-", "小腿、腘绳肌、髋屈肌、臀"),
    ],
    specific: [
      ex("慢跑 + 动态拉伸", "20 分钟", "轻松", "-", "保持身体热度，不积累疲劳"),
      ex("放松整理 + 呼吸", "10 分钟", "低", "-", "为下一堂高质量课做准备"),
    ],
    taper: [
      ex("慢跑/快走 + 拉伸", "15-20 分钟", "轻松", "-", "减量不减恢复，保证睡眠"),
    ],
  });
}

// ============ 每日辅助（专项补强 / 核心 / 监控） ============
function auxItems(role: RolePlus, phase: PhaseKey, a: SingleAnalysis): ExerciseDoc[] {
  if (role === "speed") {
    if (a.speedFocus === "accel") {
      return [ex("爆发性起跑 + 阻力带起跑", "5 次", "爆发", "组间 2 分钟", "本周重点补强：起跑加速"), ex("踝关节弹性小跳", "3×20 次", "中", "组间 60 秒", "快速触地")];
    }
    if (a.speedFocus === "speedEnd") {
      return [ex("150 米放松技术跑", "2×150 米", "85%", "组间 4 分钟", "本周重点补强：后程保持"), ex("核心抗旋转", "每侧 3×8 次", "中", "组间 60 秒", "躯干刚性")];
    }
    return [ex("摆臂与身体姿态分解", "3 组", "低-中", "-", "放松技术"), ex("核心：平板+侧桥", "3 轮", "中", "组间 60 秒", "躯干稳定")];
  }
  if (role === "jump" || role === "jumpTech") {
    if (a.jumpPower === "low") {
      return [ex("跳深（30-40cm 跳箱）", "3×5 次", "快速", "组间 2 分钟", "本周补强：落地-起跳弹性（先于完整技术）"), ex("后抛实心球", "6×2 组", "85%", "组间 2 分钟", "全身协调")];
    }
    return [ex("立定跳远（监控丈量）", "4 次取最好", "90%", "组间 2 分钟", "记录水平爆发力变化"), ex("单足跳（左右）", "每侧 3×15 米", "中-高", "组间 2 分钟", "起跳腿与摆动腿均衡")];
  }
  if (role === "power") {
    return [ex("后抛实心球（2kg）", "8×3 组", "85-90%", "组间 2 分钟", "全身链条协调"), ex("悬垂举腿/平板", "3 轮", "中-高", "组间 60 秒", "核心传递力量")];
  }
  if (role === "speedEnd") {
    return [ex("核心：死虫式+侧桥", "3 轮", "中", "组间 60 秒", "后程不掉技术"), ex("踝关节弹性跳绳", "3×60 秒", "中", "组间 60 秒", "脚掌弹性")];
  }
  if (role === "tech") {
    return [ex("录像回看与自我对照", "1 个要点", "-", "-", "USATF：视觉反馈 + 语言提示结合")];
  }
  return [];
}

// ============ 组装每日课 ============
const SPEED_FOCUS_TAG: Record<SpeedFocus, string> = {
  accel: " · 本周重点：起跑加速",
  maxSpeed: " · 本周重点：途中最大速度",
  speedEnd: " · 本周重点：后程/速度耐力",
  balanced: "",
  unknown: "",
};

function roleTechNotes(role: RolePlus, phase: PhaseKey): string[] {
  const m: Partial<Record<RolePlus, Record<PhaseKey, string[]>>> = {
    speed: {
      base: ["USATF 短跑模型：起跑反应 → 加速（0-30m，前倾渐抬）→ 途中最大速度（放松大步）→ 减速控制。基础期先把每一步做对，再谈跑快。"],
      build: ["把基础期“速度素质”转成 100 米能力：加速段要“快而有力”，途中段要“松而不垮”；组间休息必须充分，宁长勿短。"],
      specific: ["专项期每组都接近个人最好，但起跑一次成型、不追求侥幸成绩；掉速时先查途中放松技术，而不是硬顶。"],
      taper: ["只刺激不消耗：强度高、量小、恢复长，为考试日保留神经兴奋。"],
    },
    jump: {
      base: ["USATF 跳远模型：助跑（稳定节奏、步点）→ 起跳（最后三步大-小-快、上板不减速）→ 腾空（摆臂+换步）→ 落地（收腿前伸、重心前送）。"],
      build: ["专项转化：助跑速度要“能控住地跑得快”，起跳腿快速下压、摆动腿前送，把水平速度转成向上向前的腾起。"],
      specific: ["专项期以“稳定成绩”为主：每次丈量记录，连续两次无进步先查助跑节奏与恢复，不要盲目加量（质量优先原则）。"],
      taper: ["赛前跳远只做高质量短程技术，避免疲劳堆积与陌生强度。"],
    },
    jumpTech: {
      base: ["分解优先：上板、腾空、落地分开练，动作模型稳定后再串成完整跳（USATF：从分解到完整）。"],
      build: ["“最后三步节奏”是急行跳远上板质量的关键：用标志物建立稳定步点，上板前不减速、不调整。"],
      specific: ["用录像做“一次一个要点”的修正，避免一次改太多导致动作混乱。"],
      taper: ["只保持步点与感觉，不上强度。"],
    },
    power: {
      base: ["力量-速度连续体：先建立最大力量与动作质量（深蹲/硬拉），为后面快速伸缩复合打底（USATF 力量训练原则）。"],
      build: ["力量向专项转化：最大力量（低次数组）与爆发力（快速伸缩复合/后抛）同周安排，中间留足恢复。"],
      specific: ["竞赛期力量以“维持最大力量储备”为主，配合轻快爆发，避免影响速度与跳跃课的恢复。"],
      taper: ["减量期力量只做神经刺激：小量、高强度、充分恢复。"],
    },
    speedEnd: {
      base: ["特殊耐力Ⅰ（Special Endurance I）：略超主项距离、强度中高，是 100 米后程能力的基础（USATF 分类思路）。"],
      build: ["后程掉速通常不是“不够拼”，而是速度储备与放松技术不足：先保证组间充分恢复，再谈数量。"],
      specific: ["以 150 米+冲刺组合模拟考试后程，注意“顶”是保持节奏与步幅，而不是僵硬咬牙。"],
      taper: ["赛前速度耐力只留少量刺激，避免积累疲劳。"],
    },
    tech: {
      base: ["技术学习顺序：建立正确动作模型 → 大量分解练习 → 完整动作；先质量后强度（动作学习原则）。"],
      build: ["录像 + 语言提示 + 一次一个要点，是纠正跑跳技术最有效的方式之一。"],
      specific: ["考前技术只做“保持与微调”，不引入新动作、不推翻已稳定的技术模型。"],
      taper: ["保持技术感觉即可。"],
    },
    recovery: {
      base: ["超量恢复：训练刺激只有在充分恢复后才会“长出能力”；恢复日不是浪费，是训练的一部分。"],
      build: ["高质量训练周之间要有主动恢复日，防止疲劳累积导致伤病与平台期。"],
      specific: ["考前两周把“恢复”当训练重点：睡眠、营养、低强度活动优先。"],
      taper: ["减量不减恢复质量：保证睡眠 7-9 小时。"],
    },
  };
  return m[role]?.[phase] ?? [];
}

function dayBlock(role: RolePlus, phase: PhaseKey, day: number, minutes: number, a: SingleAnalysis, events: SingleEvents = "both"): DayDoc {
  const isJump = role === "jump" || role === "jumpTech";
  const isRecovery = role === "recovery";
  const tag = role === "speed" ? SPEED_FOCUS_TAG[a.speedFocus] : "";
  const aux = auxItems(role, phase, a);
  const blocks: BlockDoc[] = [warmup(isJump)];
  if (isRecovery) {
    blocks.push({ kind: "aux", label: "主动恢复 + 核心稳定", items: mainItems(role, phase, events) });
  } else {
    blocks.push({ kind: "main", label: mainLabel(role, events), items: mainItems(role, phase, events) });
    if (aux.length) blocks.push({ kind: "aux", label: "辅助：专项补强 / 核心 / 监控", items: aux });
    blocks.push({ kind: "core", label: "核心与落地安全（3-5 分钟）", items: coreBlock() });
  }
  blocks.push(cooldown());
  return {
    day,
    title: (events === "longJump" && role === "speed" ? LONGJUMP_SPEED_TITLE[phase] : events === "sprint" && role === "tech" ? SPRINT_TECH_TITLE[phase] : ROLE_TITLES[role][phase]) + tag,
    durationMin: minutes,
    blocks,
    techNotes: roleTechNotes(role, phase),
  };
}

function mainLabel(role: RolePlus, events: SingleEvents = "both"): string {
  if (role === "speed") return events === "longJump" ? "主课：助跑速度 / 短冲" : "主课：100 米速度训练";
  if (role === "jump" || role === "jumpTech") return "主课：急行跳远专项";
  if (role === "power") return "主课：力量与爆发";
  if (role === "speedEnd") return "主课：速度耐力 / 后程";
  if (role === "tech") return "主课：技术精修";
  return "主课";
}
function coreBlock(): ExerciseDoc[] {
  return [
    ex("平板支撑 + 侧桥", "平板 40s + 侧桥每侧 25s", "中", "组间 30 秒", "躯干刚性，跑跳不散"),
    ex("落地安全提示", "1 次提醒", "-", "-", "跳远落地屈髋屈膝、重心前送，避免后坐"),
  ];
}

// ============ 阶段说明（目标 / 推进 / 原则） ============
const PHASE_GOAL: Record<PhaseKey, string> = {
  base: "一般准备期：建立 100 米与急行跳远两项的“正确技术模型”与一般力量/有氧底子。量较大、强度中低，先做对、再做大。",
  build: "专项化强化期：把基础素质转化为专项速度与跳远能力（力量-速度连续体向专项转化），量、强度同步爬坡，技术趋于稳定。",
  specific: "竞赛期：以接近考试强度的完整技术、速度与模拟为主，量控制、质保证，重点是稳定发挥与细节打磨。",
  taper: "赛前减量调整：保持神经与速度刺激，总量大幅下降，充分恢复，把状态调到考试日。",
};

const PROGRESSION: Record<PhaseKey, string> = {
  base: "周内推进：第 1 周技术+适应为主（用强度下限）；第 2-3 周在动作标准前提下小幅加量，每周总量增幅≤10%；阶段末一周略减量并做一次“测验包”基线，带着好状态进入强化期。",
  build: "周内推进：第 1 周中等量找状态；第 2-3 周把强度与量推到阶段峰值（专项课之间至少间隔 48 小时）；最后一周减量 20-30% 并做阶段测验，看数据再决定专项期侧重。",
  specific: "保持高强度但总量受控：百米与跳远每周各至少 1-2 次高质量专项；若连续两周无进步，先检查助跑节奏/技术录像与恢复睡眠，而不是盲目加量。",
  taper: "减量不减强度：单课总量约为平时的 50-60%，强度保持 90-100%；只做高质量刺激，充分睡眠与恢复，避免新动作与陌生强度。",
};

const PHASE_PRINCIPLES: Record<PhaseKey, string[]> = {
  base: ["先建立技术模型（USATF：分解→完整、慢→快）", "一般力量与有氧打底，量先于强度", "RAMP 热身 + 每课记录 RPE"],
  build: ["力量-速度连续体转化：深蹲/硬拉 + 快速伸缩复合同周", "专项强度爬坡，但每周增幅 ≤10%", "专项课（速度/跳远）间隔 ≥48 小时"],
  specific: ["对比组 / PAP：最大力量激活后接爆发，节省时间提升质量", "每课记录成绩，用数据决定下周侧重", "模拟考试节奏与流程"],
  taper: ["减量不减强度，神经保持兴奋", "不引入新技术、不试新强度", "睡眠 7-9 小时，营养充足"],
};

// ============ 周期推进备注（按阶段+周次，写进日历） ============
function weekNote(phase: PhaseKey, w: number, weeks: number): string {
  if (w === 0) return "阶段开始：做“测验包”基线（30m、60m、立定跳远、100米、急行跳远），录入系统";
  if (w === weeks - 1) return "阶段末：本周减量 20-30%，复测关键项，数据用于下一阶段侧重";
  if (phase === "base") return w === 1 ? "第 2 周：技术+小幅加量，动作标准优先" : "按基础期模板推进：量为主、强度中低，先做对";
  if (phase === "build") return w === 1 ? "第 2 周：强度量爬坡，专项课间隔 48h" : "按强化期模板推进：专项转化，避免疲劳堆积";
  if (phase === "specific") return w === 1 ? "第 2 周：保持高质量专项，记录成绩" : "按竞赛期模板推进：质保证、量受控";
  return "赛前调整：只做高质量刺激，充分恢复";
}

// ============ 主构建函数 ============
export function buildSinglePlanDoc(input: Input): PlanDoc {
  const k = input.daysPerWeek === 4 || input.daysPerWeek === 5 || input.daysPerWeek === 6 ? input.daysPerWeek : 6;
  const realWeeks = weeksUntil(input.examDate);
  const totalWeeks = realWeeks !== null && realWeeks > 0 ? realWeeks : 12;
  const phases = planPhases(totalWeeks);
  const a = analyzeSingle(input);
  const events: SingleEvents = input.events ?? "both";
  const hasSprint = events === "sprint" || events === "both";
  const hasJump = events === "longJump" || events === "both";
  const evTitle =
    events === "sprint" ? "百米单招训练计划"
    : events === "longJump" ? "急行跳远单招训练计划"
    : "单招专项（100米+急行跳远）训练计划";

  const periods: PeriodDoc[] = phases.map((p) => ({
    key: p.key,
    name: p.name,
    weeks: p.weeks,
    goal: PHASE_GOAL[p.key],
    principles: PHASE_PRINCIPLES[p.key],
    progression: PROGRESSION[p.key],
    weeklySchedule: rolesFor(events, k).map((role, idx) =>
      dayBlock(role, p.key, idx + 1, pick(p.key, { base: 95, build: 105, specific: 100, taper: 75 }), a, events),
    ),
  }));

  const calendar: PlanDoc["calendar"] = [];
  let wn = 1;
  for (const p of phases) {
    for (let w = 0; w < p.weeks; w++) {
      calendar.push({ week: wn, phaseKey: p.key, phaseName: p.name, note: weekNote(p.key, w, p.weeks) });
      wn++;
    }
  }

  const advice: string[] = [];
  advice.push(
    events === "sprint"
      ? `百米单招专项。每周 ${k} 练，按“速度课 / 力量爆发 / 速度耐力${k >= 5 ? " / 百米技术精修" : ""}${k >= 6 ? " / 主动恢复" : ""}”课型组合（速度课每周 2 次）；跳跃只作为下肢爆发力发展手段（跳深/连续跳/跳箱），不安排急行跳远完整技术主课。`
      : events === "longJump"
      ? `急行跳远单招专项。每周 ${k} 练，按“跳远技术 / 力量爆发 / 助跑速度·短冲 / 跳远分解${k >= 5 ? " / 助跑速度" : ""}${k >= 6 ? " / 主动恢复" : ""}”课型组合；短跑只用于助跑速度与跑跳能力（20-60m 短冲），不安排 100 米比赛性速度耐力主课。`
      : `单招专项：100 米 + 急行跳远（助跑跳远）。每周 ${k} 练，按“速度 / 跳远 / 力量爆发 / 速度耐力${k >= 5 ? " / 技术精修" : ""}${k >= 6 ? " / 跳远分解+恢复" : ""}”课型组合，保证两项主项每周都有高质量专项课。`
  );
  advice.push("训练按“专项技术模型 + 周期化”组织：先建立正确动作，再逐步加强度，临近考试转为“稳定发挥 + 状态调整”。");
  advice.push(...a.notes);
  if (hasSprint && a.speedFocus === "accel") advice.push("本周/近期速度侧重：起跑加速补强（30m 爆发 + 反应 + 下肢快速力量）。");
  if (hasSprint && a.speedFocus === "maxSpeed") advice.push("本周/近期速度侧重：途中最大速度（行进间 40-60m、放松大步、送髋）。");
  if (hasSprint && a.speedFocus === "speedEnd") advice.push("本周/近期速度侧重：后程能力（120-150m 重复跑 + 放松技术）。");
  if (hasJump && a.jumpPower === "low") advice.push("跳远/爆发侧重：先补下肢爆发基础（深蹲/跳深/连续跳），再练完整技术，避免“技术再好也跳不远”。");
  if (hasSprint && a.jumpPower === "low") advice.push("百米单招提示：立定跳远偏弱说明下肢快速力量不足，力量日的跳跃/快速伸缩复合请认真完成，这直接关系起跑加速与步幅。");
  if (realWeeks === null) advice.push("未设考试日期，当前按 12 周默认周期生成；建议在档案填目标考试日期以自动倒推。");
  if (input.injuryNote) advice.push(`学生自述需注意：${input.injuryNote}。相关练习请减量或暂缓，疼痛即停。`);

  const findings = a.findings.filter((x) => x.severity !== "low");

  return {
    version: 1,
    meta: {
      generatedAt: new Date().toISOString(),
      weeksToExam: realWeeks,
      daysPerWeek: k,
      mode: "rule",
      program: "single",
      singleEvents: events,
      examDate: input.examDate,
      title: `${input.name} · ${evTitle}`,
      coachAdvice: advice,
      basis: [
        (events === "sprint"
          ? "分项技术模型（USATF 短跑思路）：按“反应起跑 → 加速（0-30m）→ 途中最大速度 → 减速控制”四段建模；跳跃（跳深/连续跳/跳箱）作为下肢快速力量手段，不占用技术课时。"
          : events === "longJump"
          ? "分项技术模型（USATF 跳远思路）：按“助跑 → 起跳 → 腾空 → 落地”四环节建模；短跑只用于发展助跑速度（20-60m 短冲、上板节奏），不安排 100 米速度耐力课。"
          : "分项技术模型（参考美国田径协会 USATF 教练员教育思路）：100 米按“起跑反应→加速→途中最大速度→减速控制”四段，急行跳远按“助跑→起跳→腾空→落地”四环节逐项建模与打磨。"),
        "周期化 + 板块化：由考试日期倒推，基础期（建技术+一般力量）→强化期（力量-速度专项转化）→专项期（接近考试强度的完整技术）→赛前减量（taper）。",
        "力量-速度连续体与对比训练：最大力量（深蹲/硬拉）与快速伸缩复合（跳深/连续跳）同周安排，并用“大重量+爆发”对比组（PAP）提高转化效率。",
        (events === "longJump"
          ? "助跑速度与跑跳转化：用 20-60m 短冲、上板前最后三步节奏与连续跳跃发展“跑得快 + 上板准”，不依赖 100 米式的长距离速度耐力。"
          : "特殊耐力（Special Endurance）：用略超主项距离的 120-200m 重复跑来发展 100 米后程能力（速度耐力），避免过早专项化堆强度。"),
        "RAMP 热身与整理放松：热身按提升-激活-动员-强化结构，跳跃课前加轻跳预刺激；课末记录 RPE 与身体反应，按反馈与复测数据调整（自动调节）。",
        "个体化诊断：用 30m/100m、60m/100m 分段比例与立定跳远等监控项定位短板，把训练时间投到最薄弱环节（比例阈值为经验参考，非官方标准）。",
        "渐进超负荷与超量恢复：每周量/强度增幅≤10%，速度与跳跃大强度课间隔≥48 小时，睡眠 7-9 小时——训练效果在恢复后产生。",
        "测验-反馈闭环：阶段末测验包复测，用数据决定下一阶段侧重；考前 10-14 天做一次" + (events === "sprint" ? "100 米全真模拟" : events === "longJump" ? "急行跳远全真模拟" : "两项全真模拟") + "（以赛带练、为考试做专项准备）。",
      ],
    },
    diagnosis: {
      summaryLines: advice.slice(),
      findings,
    },
    calendar,
    periods,
    safety: [
      "大强度跑/跳前必须完成 RAMP 热身（15-20 分钟），结束做整理放松。",
      "急行跳远请在沙坑或软垫处练习；落地屈髋屈膝、两腿前伸、重心前送，防止“后坐”受伤。",
      "速度与跳跃大强度课之间至少间隔 48 小时；力量课次日避免同肌群大强度跳跃。",
      "膝、踝、腰、跟腱出现疼痛立即停止相关练习并向教练报告，不要“忍痛训练”。",
      "力量训练保证动作规范与保护；高翻等爆发动作无把握时先用替代动作或轻重量。",
    ],
    reassessment:
      events === "sprint"
        ? [
            "阶段测验包（每阶段末约 30 分钟）：30m、60m、立定跳远、100米，录入系统供下一周期自动调整。",
            "专项期每周轮测主项：30m/60m 与 100 米交替计时，看趋势而非单次波动。",
            "连续两次测验无进步：先复查技术录像（起跑衔接/途中放松/后程）与恢复情况，其次才是加量。",
            "考前 10-14 天做一次 100 米全真模拟：用起跑器、按考试节奏完整走流程。",
          ]
        : events === "longJump"
        ? [
            "阶段测验包（每阶段末约 30 分钟）：立定跳远、急行跳远（全程丈量）、30m，录入系统供下一周期自动调整。",
            "专项期每周轮测主项：急行跳远全程丈量 + 立定跳远监控，看趋势而非单次波动。",
            "连续两次测验无进步：先复查助跑节奏/上板/腾空落地录像与恢复情况，其次才是加量。",
            "考前 10-14 天做一次急行跳远全真模拟：完整助跑丈量流程，熟悉节奏与步点。",
          ]
        : [
            "阶段测验包（每阶段末约 30 分钟）：30m、60m、立定跳远、100米、急行跳远，录入系统供下一周期自动调整。",
            "专项期改为每周轮测主项：100 米与急行跳远交替丈量，看趋势而非单次波动。",
            "连续两次测验无进步：先复查技术录像（助跑节奏/上板/途中放松）与恢复情况，其次才是加量。",
            "考前 10-14 天做一次两项全真模拟：按考试顺序与间隔完整走流程，熟悉体力分配。",
          ],
  };
}
