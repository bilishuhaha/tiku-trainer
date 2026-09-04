import type { PlanDoc } from "./types";

/**
 * 可选：调用大模型对“规则引擎生成的计划”做中文润色与个性化说明。
 * 未配置 OPENAI_API_KEY 或调用失败时静默返回 null，调用方继续使用规则引擎结果。
 */
export async function enhanceWithLlm(doc: PlanDoc): Promise<{ mode: "llm"; coachAdvice: string[]; basis: string[] } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const summary = {
    title: doc.meta.title,
    weeksToExam: doc.meta.weeksToExam,
    daysPerWeek: doc.meta.daysPerWeek,
    periods: doc.periods.map((p) => ({ name: p.name, weeks: p.weeks })),
    findings: doc.diagnosis.findings.slice(0, 6).map((x) => ({ severity: x.severity, title: x.title })),
    advice: doc.meta.coachAdvice,
  };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "你是一名为中国体育高考（100米、立定三级跳远、原地推铅球）考生制定训练计划的高水平田径教练，熟悉周期化训练与运动科学。请用简体中文输出。只输出 JSON。",
          },
          {
            role: "user",
            content:
              "以下是规则引擎生成的一份周期训练计划的要点。请以资深教练口吻，输出 JSON：{coachAdvice: string[](3-6条，给教练看的执行要点与个性化提醒，不要泛泛而谈), basis: string[](2-4条，说明该计划符合的科学训练原则)}。注意结合 findings 中的短板与距离考试周数给出具体建议。不要虚构成绩或医学建议。计划要点：" +
              JSON.stringify(summary),
          },
        ],
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { coachAdvice?: unknown; basis?: unknown };
    const coachAdvice = Array.isArray(parsed.coachAdvice) ? parsed.coachAdvice.filter((x): x is string => typeof x === "string") : [];
    const basis = Array.isArray(parsed.basis) ? parsed.basis.filter((x): x is string => typeof x === "string") : [];
    if (!coachAdvice.length) return null;
    return { mode: "llm", coachAdvice, basis: basis.length ? basis : doc.meta.basis };
  } catch {
    return null;
  }
}
