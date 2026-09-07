import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, UserRound, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { findStudent, listScores } from "@/lib/repo";
import { ConfirmForm } from "@/components/forms";
import PendingSubmitButton from "@/components/pending-submit-button";
import { confirmPendingAction, deleteStudentAction } from "@/lib/actions";
import { itemLabel, itemUnit } from "@/lib/domain/items";
import { calcAge, fmtDate, todayInputValue } from "@/lib/format";

export const metadata: Metadata = { title: "新生详情" };

export default async function PendingReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const student = await findStudent(id, user.id);
  if (!student || student.pending !== 1) notFound();
  const scores = await listScores(id);
  const age = calcAge(student.birthDate);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/students/pending" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 待确认新生列表
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">新生评估 · {student.name}</h1>
        <p className="text-sm text-slate-500">核对无误后点“确认入库”，学生即可出现在你的学生列表；之后你就能生成访问码发给他。</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><UserRound className="h-5 w-5 text-slate-400" /> 基本信息</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          <Row label="姓名" value={student.name} />
          <Row label="性别" value={student.gender === "male" ? "男" : "女"} />
          <Row label="年龄" value={age !== null ? `${age} 岁` : "—"} />
          <Row label="出生日期" value={fmtDate(student.birthDate)} />
          <Row label="身高" value={student.height !== null ? `${student.height} cm` : "—"} />
          <Row label="体重" value={student.weight !== null ? `${student.weight} kg` : "—"} />
          <Row label="联系电话/微信" value={student.contact ?? "—"} />
          <Row label="已训练年限" value={student.trainingYears !== null ? `${student.trainingYears} 年` : "—"} />
          <Row label="提交时间" value={fmtDate(student.createdAt, true)} />
        </dl>
        {student.goalNote && <Note label="🎯 目标" text={student.goalNote} />}
        {student.injuryNote && <Note label="⚠️ 旧伤/注意" text={student.injuryNote} />}
        {student.note && <Note label="📝 备注" text={student.note} />}
        {student.examDate && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">预计考试日期：{fmtDate(student.examDate)}（已填入档案“考试日期”）</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><ClipboardList className="h-5 w-5 text-slate-400" /> 已自动归档的成绩</h2>
        <p className="mb-3 text-xs text-slate-500">学生填的这些“当前成绩”已自动存入成绩记录（日期 {todayInputValue()}，标记“新生评估自报”），确认后可在档案里直接看到并用于生成计划。</p>
        {scores.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">该生没有填写成绩项（或都在正式测试后补录）</p>
        ) : (
          <div className="space-y-1.5">
            {scores.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">{itemLabel(s.item)}</span>
                <span className="font-semibold tabular-nums text-slate-900">{s.value.toFixed(2)} {itemUnit(s.item)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action={confirmPendingAction}>
          <input type="hidden" name="id" value={student.id} />
          <PendingSubmitButton pendingText="确认中…" className="btn btn-primary">
            <CheckCircle2 className="h-4 w-4" /> 确认入库
          </PendingSubmitButton>
        </form>
        <ConfirmForm action={deleteStudentAction} message={`确定拒绝/删除「${student.name}」这条报名？其成绩记录也会一并删除。`}>
          <input type="hidden" name="id" value={student.id} />
          <button type="submit" className="btn btn-ghost text-rose-600 hover:bg-rose-50"><XCircle className="h-4 w-4" /> 拒绝删除</button>
        </ConfirmForm>
      </div>
      <p className="text-xs text-slate-400">确认后如需修改（姓名、成绩等），可在学生档案里编辑。</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}
function Note({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span className="mr-2 text-xs text-slate-400">{label}</span>{text}
    </div>
  );
}
