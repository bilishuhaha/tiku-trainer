import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, CheckCircle2, UserRound, ClipboardList, KeyRound, ChevronLeft } from "lucide-react";
import { findUserById } from "@/lib/repo";
import { submitEnrollAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";
import PendingSubmitButton from "@/components/pending-submit-button";

export const metadata: Metadata = { title: "新生身体评估报名" };

export default async function EnrollPage({ searchParams }: { searchParams: Promise<{ c?: string; error?: string; done?: string }> }) {
  const { c, error, done } = await searchParams;
  const coach = c ? await findUserById(c) : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 px-4 py-6">
      <div className="mx-auto w-full max-w-lg">
        {/* 顶部 */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">新生身体评估报名</h1>
          <p className="mt-1 text-sm text-slate-500">
            {coach ? <>给 <b className="text-slate-700">{coach.name} 教练</b> 的评估表</> : "完善信息，让教练给你出更准的计划"}
          </p>
        </div>

        {done === "1" ? (
          <div className="card p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">提交成功！</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
              教练收到后会确认你的资料，并把<b>访问码</b>发给你。
              拿到访问码后，到这里开始每天的训练：
            </p>
            <Link href="/s/login" className="btn btn-primary mt-5 w-full">去学生登录</Link>
            <p className="mt-3 text-xs text-slate-400">还没有访问码？等教练联系你即可，不用重复提交。</p>
          </div>
        ) : !coach ? (
          <div className="card p-8 text-center">
            <ErrorBanner error={error} />
            <p className="text-sm text-slate-600">这个报名链接不完整或已失效。</p>
            <p className="mt-1 text-xs text-slate-400">请向教练重新索取报名链接（通常是教练微信发给你的一条网址）。</p>
            <Link href="/s/login" className="btn btn-outline mt-5 w-full">已有访问码？去登录</Link>
          </div>
        ) : (
          <>
            {/* 三步提示 */}
            <div className="mb-4 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500">
              <StepTip icon={<ClipboardList className="h-4 w-4" />} label="填评估表" n={1} />
              <StepTip icon={<UserRound className="h-4 w-4" />} label="教练确认" n={2} />
              <StepTip icon={<KeyRound className="h-4 w-4" />} label="收到访问码" n={3} />
            </div>

            <div className="card p-5">
              <ErrorBanner error={error} />
              <form action={submitEnrollAction} className="space-y-5">
                <input type="hidden" name="coach" value={coach.id} />

                {/* 基本信息 */}
                <Section no="1" title="基本信息" desc="* 为必填" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="姓名 *" full>
                    <input name="name" required maxLength={20} className="input" placeholder="你的姓名" />
                  </Field>
                  <Field label="性别 *">
                    <div className="flex h-10 overflow-hidden rounded-lg border border-slate-300 text-sm">
                      {(["male", "female"] as const).map((g) => (
                        <label key={g} className="flex flex-1 cursor-pointer items-center justify-center has-[:checked]:bg-emerald-600 has-[:checked]:text-white has-[:checked]:font-medium">
                          <input type="radio" name="gender" value={g} className="hidden" defaultChecked={g === "male"} />
                          {g === "male" ? "男" : "女"}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="出生年月日" full>
                    <input name="birthDate" type="date" className="input" max={new Date().toISOString().slice(0, 10)} />
                  </Field>
                  <Field label="身高（cm）"><input name="height" type="number" inputMode="decimal" step="0.5" min="100" className="input" placeholder="如 175" /></Field>
                  <Field label="体重（kg）"><input name="weight" type="number" inputMode="decimal" step="0.5" min="30" className="input" placeholder="如 65" /></Field>
                  <Field label="联系电话 / 微信" full>
                    <input name="contact" maxLength={30} className="input" placeholder="方便教练联系你（选填）" />
                  </Field>
                  <Field label="已训练年限（年）" full>
                    <input name="trainingYears" type="number" inputMode="decimal" min="0" step="0.5" className="input" placeholder="如 1（没练过填 0）" />
                  </Field>
                </div>

                {/* 目标与伤病 */}
                <Section no="2" title="目标 & 身体情况" />
                <Field label="想考的学校 / 目标（选填）" full>
                  <input name="goalNote" maxLength={120} className="input" placeholder="如：目标 XX 大学体育教育专业 / 术科 250+" />
                </Field>
                <Field label="预计考试日期（选填）" full>
                  <input name="examDate" type="date" className="input" />
                </Field>
                <Field label="旧伤 / 需要注意的地方（选填）" full>
                  <textarea name="injuryNote" rows={2} maxLength={300} className="input" placeholder="如：左脚踝有过扭伤、膝盖偶尔疼…" />
                </Field>
                <Field label="想对教练说的话（选填）" full>
                  <textarea name="note" rows={2} maxLength={300} className="input" placeholder="作息、能练的时间、其它情况…" />
                </Field>

                {/* 当前成绩 */}
                <Section no="3" title="当前基础成绩" desc="有就填，没有可留空；记得先热身再测，安全第一" />
                <p className="text-xs font-semibold text-slate-600">🏃 短跑（秒，越快越厉害）</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="100 米（主项）"><input name="sprint100" type="number" inputMode="decimal" step="0.01" min="8" className="input" placeholder="如 13.2" /></Field>
                  <Field label="60 米"><input name="sprint60" type="number" inputMode="decimal" step="0.01" min="5" className="input" placeholder="如 8.5" /></Field>
                  <Field label="30 米（站立式）"><input name="sprint30" type="number" inputMode="decimal" step="0.01" min="3" className="input" placeholder="如 4.6" /></Field>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-600">🦵 跳跃（米）</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="立定三级跳远（主项）"><input name="tripleJump" type="number" inputMode="decimal" step="0.01" min="3" className="input" placeholder="如 7.8" /></Field>
                  <Field label="立定跳远"><input name="standingLongJump" type="number" inputMode="decimal" step="0.01" min="1" className="input" placeholder="如 2.6" /></Field>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-600">💪 投掷（米）</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="原地推铅球（主项）"><input name="shotPut" type="number" inputMode="decimal" step="0.01" min="3" className="input" placeholder="如 9.8" /></Field>
                  <Field label="说明">
                    <div className="flex h-10 items-center rounded-lg bg-slate-50 px-3 text-[11px] leading-tight text-slate-500">男生用 5kg，女生用 4kg，按本省考试标准</div>
                  </Field>
                </div>

                <PendingSubmitButton pendingText="提交中…" className="btn w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-base text-white hover:from-emerald-500 hover:to-teal-500">提交评估表</PendingSubmitButton>
                <p className="text-center text-[11px] text-slate-400">提交后由教练确认。确认前不会生成访问码，信息仅用于评估，请如实填写。</p>
              </form>
            </div>

            <Link href="/s/login" className="mt-4 inline-flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              <ChevronLeft className="h-3.5 w-3.5" /> 已有访问码？直接去学生登录
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

function StepTip({ icon, label, n }: { icon: React.ReactNode; label: string; n: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-1 py-2">
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">{n}</div>
      <div className="text-emerald-600">{icon}</div>
      <div className="mt-1">{label}</div>
    </div>
  );
}

function Section({ no, title, desc }: { no: string; title: string; desc?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-100 pb-1.5">
      <h2 className="text-sm font-bold text-slate-800">{no}、{title}</h2>
      {desc ? <span className="text-[11px] text-slate-400">{desc}</span> : null}
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

