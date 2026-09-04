import type { DiagnosisResult, EventKey, Finding, FocusWeights, PlanRequest, Severity } from "./types";

function v(req: PlanRequest, item: string): number | null {
  const s = req.latest[item];
  return s ? s.value : null;
}
function has(req: PlanRequest, item: string): boolean {
  return v(req, item) !== null;
}

function f(sev: Severity, title: string, detail: string, advice: string, event: EventKey | "general"): Finding {
  return { severity: sev, title, detail, advice, event };
}

const W = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

export function diagnose(req: PlanRequest): DiagnosisResult {
  const findings: Finding[] = [];
  const focus: FocusWeights = { accel: 40, maxSpeed: 40, speedEnd: 30, jumpPower: 50, jumpTech: 40, throwPower: 40, throwTech: 40, strength: 40, core: 35 };
  const eventNotes: Partial<Record<EventKey, string>> = {};
  const summaryLines: string[] = [];
  const gender = req.student.gender;
  const years = req.student.trainingYears ?? 1;

  const sprint100 = v(req, "sprint100");
  const sprint60 = v(req, "sprint60");
  const sprint30 = v(req, "sprint30");
  const t30 = sprint30;
  const t60 = sprint60;
  const t100 = sprint100;
  const tj = v(req, "tripleJump");
  const slj = v(req, "standingLongJump");
  const sp = v(req, "shotPut");
  const med = v(req, "medBallBack");
  const squat = v(req, "squat");
  const bench = v(req, "bench");
  const weight = req.student.weightKg ? Number(req.student.weightKg) : null;
  const goalSprint = req.goals.sprint;
  const goalTJ = req.goals.tripleJump;
  const goalSP = req.goals.shotPut;

  // ============ 短跑 ============
  const sprintFindings: Finding[] = [];
  if (t100 !== null) {
    if (goalSprint !== null && goalSprint !== undefined) {
      const gap = t100 - goalSprint; // 秒，正数=慢于目标
      if (gap > 0.05) {
        const sev: Severity = gap >= 0.9 ? "high" : gap >= 0.4 ? "medium" : "low";
        sprintFindings.push(f(
          sev,
          `100米 ${t100.toFixed(2)}s，距目标 ${goalSprint.toFixed(2)}s 还差约 ${gap.toFixed(2)}s`,
          years < 1 ? "训练年限较短，成绩提升空间主要来自技术动作经济性与基础力量储备。" : "当前差距需拆成“起跑加速 / 途中最大速度 / 后程耐力”三段定位，才能把训练时间花在刀刃上。",
          "请尽量补测 30m 与 60m（同一天），以便区分短板；本系统会据此细化训练侧重。",
          "sprint"
        ));
      } else {
        sprintFindings.push(f("low", "100米已达到/接近设定目标", `当前 ${t100.toFixed(2)}s，目标 ${goalSprint.toFixed(2)}s。`, "维持速度课质量即可，把精力转向更弱的项目。", "sprint"));
      }
    } else {
      sprintFindings.push(f("medium", "尚未设定 100 米目标成绩", `当前 ${t100.toFixed(2)}s。`, "建议按本省体育高考评分标准填入目标成绩，诊断才能判断差距与紧迫度。", "sprint"));
    }

    // 分段定位
    if (t30 !== null && t100 !== null) {
      const ratio = t30 / t100;
      if (ratio > 0.385) {
        sprintFindings.push(f(ratio > 0.41 ? "high" : "medium", "起跑加速段相对偏慢", `30m 用时占 100m 的 ${(ratio * 100).toFixed(1)}%（经验参考：训练较好的学生约 35%~38%）。`, "把每周速度课约一半时间用于站立式起跑、30m 爆发加速与反应练习；同时加强下肢快速力量。", "sprint"));
        focus.accel = W(focus.accel + 25);
        focus.maxSpeed = W(focus.maxSpeed + 5);
      } else if (ratio < 0.345 && goalSprint !== null) {
        sprintFindings.push(f("medium", "前段不错，后程/最大速度相对偏弱", `30m 占比 ${(ratio * 100).toFixed(1)}% 偏低，说明前半程尚可，问题更可能在中后程。`, "速度课向 60-100m 途中跑、节奏跑转移；若 150m 计时偏慢则补速度耐力。", "sprint"));
        focus.maxSpeed = W(focus.maxSpeed + 20);
        focus.speedEnd = W(focus.speedEnd + 15);
      }
    }
    if (t60 !== null && t100 !== null) {
      const ratio = t60 / t100;
      if (ratio > 0.665) {
        sprintFindings.push(f(ratio > 0.69 ? "high" : "medium", "前 60m 用时占比偏高（加速段有提升空间）", `60m/100m = ${(ratio * 100).toFixed(1)}%（经验参考：约 63%~66%）。`, "强化 30-60m 的加速与最大速度衔接；多做站立式起跑接途中跑。", "sprint"));
        focus.accel = W(focus.accel + 15);
      } else if (ratio < 0.625) {
        sprintFindings.push(f("medium", "后 40m 掉速相对明显", `60m/100m = ${(ratio * 100).toFixed(1)}% 偏低，100m 后半程是短板。`, "每周安排 1 次速度耐力课（100-150m 重复跑），并改善途中跑放松技术与步幅。", "sprint"));
        focus.speedEnd = W(focus.speedEnd + 25);
        focus.maxSpeed = W(focus.maxSpeed + 10);
      }
    }
  } else if (goalSprint) {
    sprintFindings.push(f("medium", "缺少 100 米成绩", "已设定目标但没有最近成绩，无法判断差距。", "先测一次 100m（建议同场加测 30m、60m）。", "sprint"));
  }

  // ============ 立定三级跳 ============
  const jumpFindings: Finding[] = [];
  if (tj !== null) {
    if (goalTJ !== null && goalTJ !== undefined) {
      const gap = goalTJ - tj;
      if (gap > 0.05) {
        const sev: Severity = gap >= 0.8 ? "high" : gap >= 0.35 ? "medium" : "low";
        jumpFindings.push(f(sev, `三级跳 ${tj.toFixed(2)}m，距目标 ${goalTJ.toFixed(2)}m 还差 ${gap.toFixed(2)}m`, years < 1 ? "年限短者，第一年提升主要靠技术经济性与基础力量。" : "三级跳成绩 = 单跳爆发力 × 三跳衔接效率，需判断是“跳不远”还是“连不起来”。", slj !== null ? "见下方针对立定跳远与三跳比例的进一步判断。" : "建议加测立定跳远，用于区分力量基础与技术问题。", "tripleJump"));
      } else {
        jumpFindings.push(f("low", "三级跳已达到/接近设定目标", `当前 ${tj.toFixed(2)}m，目标 ${goalTJ.toFixed(2)}m。`, "保持每周 1-2 次跳跃课质量，重心转向弱项。", "tripleJump"));
      }
    } else {
      jumpFindings.push(f("medium", "尚未设定三级跳目标成绩", `当前 ${tj.toFixed(2)}m。`, "按本省标准填入目标成绩以量化差距。", "tripleJump"));
    }
  }

  if (slj !== null && tj !== null) {
    const ratio = tj / slj;
    if (ratio < 2.6) {
      jumpFindings.push(f(ratio < 2.35 ? "high" : "medium", "三跳衔接效率偏低（技术/协调短板）", `三级跳/立定跳 = ${ratio.toFixed(2)}（经验参考：动作较熟练的学生约 2.8~3.1）。说明单跳力量尚可，但三跳之间“连”得不好。`, "训练重心放在三级跳分解：第一跳低平、第二跳向前跨出、第三跳全力；多做跨步跳、单足跳衔接与节奏练习。", "tripleJump"));
      focus.jumpTech = W(focus.jumpTech + 30);
      focus.jumpPower = W(focus.jumpPower + 5);
    } else {
      jumpFindings.push(f("low", "三跳衔接比例正常", `三级跳/立定跳 = ${ratio.toFixed(2)}，节奏结构尚可。`, "若总成绩仍不理想，问题更可能在单跳爆发力本身。", "tripleJump"));
      focus.jumpPower = W(focus.jumpPower + 15);
    }
    // 用立定跳远对标爆发力基础（以三级跳目标反推合理立定跳）
    if (goalTJ !== null && goalTJ !== undefined) {
      const expectedSlj = goalTJ / 2.95;
      if (slj < expectedSlj * 0.93) {
        jumpFindings.push(f(expectedSlj - slj > 0.25 ? "high" : "medium", "下肢爆发力基础偏弱", `立定跳远 ${slj.toFixed(2)}m。按你的三级跳目标反推，立定跳约需 ${expectedSlj.toFixed(2)}m 以上作为支撑（参考 ${(goalTJ / slj).toFixed(2)} 倍关系）。`, "加入系统性下肢力量与反应力量训练：深蹲/半蹲、跳深、立定跳多组、连续蛙跳等，先“跳得高远”再“连得顺”。", "tripleJump"));
        focus.jumpPower = W(focus.jumpPower + 20);
        focus.strength = W(focus.strength + 10);
      }
    }
  } else if (slj === null && tj !== null && goalTJ !== null) {
    jumpFindings.push(f("medium", "缺少立定跳远数据，无法区分力量与技术", "", "加测立定跳远（1 分钟完成 3 次取最好）。", "tripleJump"));
  }

  // ============ 铅球 ============
  const throwFindings: Finding[] = [];
  const powerAnchor = slj ?? null; // 下肢/全身爆发参考
  if (sp !== null) {
    if (goalSP !== null && goalSP !== undefined) {
      const gap = goalSP - sp;
      if (gap > 0.05) {
        const sev: Severity = gap >= 2 ? "high" : gap >= 0.8 ? "medium" : "low";
        throwFindings.push(f(sev, `铅球 ${sp.toFixed(2)}m，距目标 ${goalSP.toFixed(2)}m 还差 ${gap.toFixed(2)}m`, "原地推铅球是“下肢蹬伸→转髋→挺胸→伸臂拨球”的全身链条，任一环节断开会明显掉成绩。", "建议结合力量测试与后抛实心球判断是“力气不够”还是“用不上力”。", "shotPut"));
      } else {
        throwFindings.push(f("low", "铅球已达到/接近设定目标", `当前 ${sp.toFixed(2)}m，目标 ${goalSP.toFixed(2)}m。`, "保持每周 1-2 次投掷课，重心转向弱项。", "shotPut"));
      }
    } else {
      throwFindings.push(f("medium", "尚未设定铅球目标成绩", `当前 ${sp.toFixed(2)}m。`, "按本省标准填入目标成绩。", "shotPut"));
    }

    if (powerAnchor !== null) {
      const anchorOk = gender === "male" ? powerAnchor >= 2.55 : powerAnchor >= 2.05;
      if (anchorOk && goalSP !== null && sp < goalSP! - 0.05) {
        throwFindings.push(f("medium", "爆发基础尚可，问题更可能在投掷技术/用力顺序", `立定跳远 ${powerAnchor.toFixed(2)}m 说明下肢爆发不算弱（经验参考：男≥2.55m/女≥2.05m）。`, "投掷课以完整技术分解为主：徒手模仿最后用力顺序→持球完整推→轻球快推体会“鞭打”感；同时补核心与上肢力量。", "shotPut"));
        focus.throwTech = W(focus.throwTech + 30);
        focus.throwPower = W(focus.throwPower + 10);
        focus.core = W(focus.core + 10);
      } else if (!anchorOk) {
        throwFindings.push(f(goalSP !== null && sp < goalSP - 0.05 ? "high" : "medium", "全身爆发/力量基础偏弱", `立定跳远 ${powerAnchor.toFixed(2)}m（经验参考：男≥2.55m/女≥2.05m 较有利于铅球）。`, "力量训练比重需加大：深蹲/半蹲、硬拉类、后抛实心球、上肢推；技术课同步进行但别用大重量球硬练。", "shotPut"));
        focus.throwPower = W(focus.throwPower + 20);
        focus.strength = W(focus.strength + 20);
      }
    }
    if (med !== null) {
      const medOk = gender === "male" ? med >= 12 : med >= 9;
      if (!medOk) {
        throwFindings.push(f("medium", "全身协调发力（后抛）偏弱", `后抛实心球 ${med.toFixed(1)}m（经验参考：男≥12m/女≥9m）。后抛是铅球全身链条的很好参照。`, "每周加入后抛/前抛实心球与站姿全身爆发练习，强化“蹬-伸-甩”的协调发力。", "shotPut"));
        focus.throwPower = W(focus.throwPower + 15);
      }
    }
    if (squat !== null && weight) {
      const rel = squat / weight;
      if (rel < 1.1) {
        throwFindings.push(f(rel < 0.9 ? "high" : "medium", "下肢最大力量储备不足", `深蹲 ${squat}kg，约为体重 ${(rel * 100).toFixed(0)}%（经验参考：男子 1.2 倍体重以上更有利于投掷/跳跃）。`, "力量课以深蹲/半蹲为主项（动作规范优先），逐步提高负重；这是投掷与跳跃共同的底层能力。", "general"));
        focus.strength = W(focus.strength + 20);
      }
    }
  } else if (goalSP) {
    throwFindings.push(f("medium", "缺少铅球成绩", "已设定目标但无最近成绩。", "先测一次原地推铅球。", "shotPut"));
  }

  // 训练年限提示（general）
  if (years !== null && years < 1) {
    findings.push(f("medium", "训练年限较短（约 " + (years < 0.5 ? "半年内" : "1 年内") + "）", "早期提升主要靠技术经济性、动作模式与基础力量，避免过早堆高强度。", "前 4-6 周以“技术 + 一般力量 + 低强度跳跃/速度”为主，量先于强度。", "general"));
    focus.strength = W(focus.strength + 15);
    focus.core = W(focus.core + 10);
  }
  if (req.student.injuryNote) {
    findings.push(f("high", "存在伤病记录，需谨慎", req.student.injuryNote, "计划中的跳跃与冲刺内容须根据伤情调整，疼痛即停；必要时先咨询医生/康复师。", "general"));
  }

  findings.push(...sprintFindings);
  findings.push(...jumpFindings);
  findings.push(...throwFindings);

  // 汇总事件备注
  if (sprintFindings.some((x) => x.title.includes("加速") || x.title.includes("前 60"))) {
    eventNotes.sprint = "短跑短板偏“前段加速”：速度课以 30m 起跑/爆发加速为主，技术要点是身体前倾角度、摆臂与脚掌快速扒地。";
  } else if (sprintFindings.some((x) => x.title.includes("后程") || x.title.includes("后 40"))) {
    eventNotes.sprint = "短跑短板偏“后程”：补 1 次/周速度耐力（100-150m 重复跑），途中跑保持放松与步幅。";
  } else if (t100 !== null) {
    eventNotes.sprint = "短跑结构较均衡：速度课保持质量，重点抓起跑反应与途中跑放松技术，靠力量课同步提升。";
  }
  if (jumpFindings.some((x) => x.title.includes("衔接"))) {
    eventNotes.tripleJump = "三级跳重点是“把单跳力量连成三跳”：多做跨步跳、单足跳接跳跃、节奏踏板练习，先解决第二跳跨不出、第一跳过高的问题。";
  } else if (jumpFindings.some((x) => x.title.includes("爆发力基础偏弱"))) {
    eventNotes.tripleJump = "三级跳先补“单跳能力”：立定跳、跳深、连续跳跃的下肢爆发与力量训练，再练完整节奏。";
  }
  if (throwFindings.some((x) => x.title.includes("用力顺序") || x.title.includes("技术"))) {
    eventNotes.shotPut = "铅球以“最后用力顺序”为纲：蹬地→转髋→挺胸→伸臂→拨球，多练徒手/轻球完整节奏，找到全身“由下往上”的发力感。";
  } else if (throwFindings.some((x) => x.title.includes("力量基础偏弱") || x.title.includes("储备不足"))) {
    eventNotes.shotPut = "铅球先补力量基础（下肢深蹲 + 上肢推 + 核心 + 后抛），技术课同步但不过度追求大重量球。";
  }

  // 教练导读
  summaryLines.push(`诊断基于 ${Object.keys(req.latest).length} 项最近成绩记录。`);
  const weakEvents = ([["sprint", "短跑"], ["tripleJump", "三级跳"], ["shotPut", "铅球"]] as [EventKey, string][]).filter(([k]) => {
    const g = req.goals[k];
    const cur = v(req, k === "sprint" ? "sprint100" : k === "tripleJump" ? "tripleJump" : "shotPut");
    return g !== null && g !== undefined && cur !== null && cur !== undefined && ((k === "sprint" ? cur > g : cur < g));
  });
  if (weakEvents.length) {
    summaryLines.push(`与目标相比，当前短板主要在：${weakEvents.map(([, label]) => label).join("、")}。`);
  } else {
    summaryLines.push("各主项目前与目标差距不大：建议把训练重心放在“保持优势项 + 深挖最接近满分的弱项”。");
  }

  return { findings, focus, summaryLines, eventNotes };
}
