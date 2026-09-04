import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PrintButton } from "@/components/forms";

export const metadata: Metadata = { title: "新生身体评估表" };

/** 填空行：底边线留白，方便手写 */
function Line({ label = "", unit, width = "w-28" }: { label?: string; unit?: string; width?: string }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      {label ? <span className="text-slate-800">{label}</span> : null}
      <span className={`inline-block border-b border-slate-500 ${width} h-5 align-bottom`} />
      {unit ? <span className="text-xs text-slate-500">{unit}</span> : null}
    </span>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-800">
      <span className="inline-block h-4 w-4 rounded-sm border border-slate-500" />
      {children}
    </span>
  );
}

function SectionTitle({ no, title, tip }: { no: string; title: string; tip?: string }) {
  return (
    <div className="mt-8 mb-3 break-inside-avoid border-l-4 border-emerald-600 pl-3 first:mt-0">
      <div className="text-[15px] font-bold text-slate-900">{no}、{title}</div>
      {tip ? <div className="mt-0.5 text-xs text-slate-500">{tip}</div> : null}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 mb-1 text-sm font-semibold text-slate-700">{children}</div>;
}

/** 成绩填写行 */
function ScoreRow({ name, note }: { name: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 break-inside-avoid border-b border-dashed border-slate-300 py-2.5 text-sm">
      <span className="w-44 shrink-0 font-medium text-slate-800">{name}</span>
      <Line width="w-24" />
      <span className="text-xs text-slate-400">{note ?? ""}</span>
    </div>
  );
}

export default async function AssessmentPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* 工具栏（打印时隐藏） */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 返回工作台
        </Link>
        <PrintButton label="打印 / 导出 PDF" />
      </div>

      {/* 评估表主体 */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-10 sm:py-8">
        {/* 抬头 */}
        <div className="text-center">
          <h1 className="text-xl font-extrabold tracking-wide text-slate-900 sm:text-2xl">体育高考 · 新生身体评估表</h1>
          <p className="mt-1 text-sm text-slate-600">第一课初始摸底 · 用于生成个性化训练计划</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-sm text-slate-700">
            <span className="inline-flex items-baseline gap-1">姓名 <span className="inline-block w-28 border-b border-slate-500" /></span>
            <span className="inline-flex flex-wrap items-baseline gap-1">
              填写日期 <span className="inline-block w-16 border-b border-slate-500" /> 年 <span className="inline-block w-8 border-b border-slate-500" /> 月 <span className="inline-block w-8 border-b border-slate-500" /> 日
            </span>
          </div>
        </div>

        {/* 填写说明 */}
        <div className="mt-6 rounded-lg bg-emerald-50/70 px-4 py-2.5 text-xs leading-relaxed text-emerald-900">
          说明：这份表用于第一节课，帮教练了解你的身体情况与初始水平，并据此安排训练。请<b>如实填写</b>；有不舒服或旧伤一定要写清楚，训练才会更安全、更有效。
        </div>

        {/* 一、基本信息 */}
        <SectionTitle no="一" title="基本信息（本人填写）" />
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2">性别：<Check>男</Check><Check>女</Check></span>
            <span className="inline-flex flex-wrap items-baseline gap-1">
              出生日期 <span className="inline-block w-14 border-b border-slate-500" /> 年 <span className="inline-block w-8 border-b border-slate-500" /> 月 <span className="inline-block w-8 border-b border-slate-500" /> 日
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <Line label="身高" width="w-16" unit="cm" />
            <Line label="体重" width="w-16" unit="kg" />
            <span className="inline-flex flex-wrap items-baseline gap-1">目标考试时间（大致即可）：<span className="inline-block w-14 border-b border-slate-500" /> 年 <span className="inline-block w-8 border-b border-slate-500" /> 月</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-slate-800">以前是否系统训练过：</span>
            <Check>没练过</Check><Check>约半年</Check><Check>约 1 年</Check><Check>1 年以上</Check>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-slate-800">一周大概能练几天：</span>
            <Check>4 天</Check><Check>5 天</Check><Check>6 天</Check>
            <span className="text-xs text-slate-400">（按你实际能来的天数勾）</span>
          </div>
        </div>

        {/* 二、摸底测试 */}
        <SectionTitle no="二" title="第一课摸底测试" tip="三项主项尽量都测；有条件再补测“辅助参考”项，能帮教练把短板判断得更准。" />
        <SubTitle>主项（必测）</SubTitle>
        <div>
          <ScoreRow name="100 米" note="秒 · 手计时请注明" />
          <ScoreRow name="立定三级跳远" note="米 · 完整动作，量最近落点" />
          <ScoreRow name="原地推铅球" note="米 · 注明球重（男 5kg / 女 4kg）" />
        </div>
        <SubTitle>辅助参考（条件允许再测，选填）</SubTitle>
        <div>
          <ScoreRow name="30 米（站立式起跑）" note="秒" />
          <ScoreRow name="60 米" note="秒" />
          <ScoreRow name="立定跳远" note="米" />
          <ScoreRow name="后抛实心球（2kg）" note="米" />
        </div>

        {/* 三、力量参考 */}
        <SectionTitle no="三" title="力量参考（有力量训练基础再填，选填）" tip="没有系统练过力量可跳过，不影响。" />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 py-1 text-sm">
          <Line label="深蹲（杠铃）" width="w-16" unit="kg" />
          <Line label="卧推" width="w-16" unit="kg" />
          <span className="text-xs text-slate-400">（近似最大重量即可）</span>
        </div>

        {/* 四、目标成绩 */}
        <SectionTitle no="四" title="你希望达到的目标成绩（选填）" tip="可参考自己最好成绩来定，稍高一点更有动力；不确定可先空着。" />
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2 py-1 text-sm">
          <Line label="100 米" width="w-20" unit="秒" />
          <Line label="立定三级跳远" width="w-20" unit="米" />
          <Line label="原地推铅球" width="w-20" unit="米" />
        </div>

        {/* 五、健康与安排 */}
        <SectionTitle no="五" title="健康与训练安排" />
        <div className="space-y-4 text-sm">
          <div className="break-inside-avoid">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-800">
              旧伤 / 需要注意的部位：<Check>无</Check><span className="text-slate-500">有（写明部位与情况）：</span>
            </div>
            <div className="mt-1 h-8 w-full border-b border-slate-500" />
          </div>
          <div className="break-inside-avoid">
            <div className="text-slate-800">其他想说明的（可训练时段 / 与文化课冲突 / 最想提高哪一项）：</div>
            <div className="mt-1 h-14 w-full border-b border-slate-500" />
          </div>
        </div>

        {/* 底部提示 */}
        <div className="mt-8 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs text-slate-400">
          <ClipboardList className="h-4 w-4 shrink-0 text-emerald-600" />
          填完后交给教练录入系统（成绩 + 目标 + 基本信息），即可为你生成第一份个性化周期训练计划。
        </div>
      </div>

      {/* 屏幕提示 */}
      <p className="no-print text-center text-xs text-slate-400">提示：点击右上角“打印 / 导出 PDF”，可保存为 PDF 发给学生，或直接打印纸质版。</p>
    </div>
  );
}
