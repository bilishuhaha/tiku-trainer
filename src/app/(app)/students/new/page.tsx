import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudentForm } from "@/components/student-form";
import { createStudentAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";

export const metadata = { title: "添加学生" };

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 返回学生列表
      </Link>
      <div>
        <h1 className="text-xl font-bold text-slate-900">添加体育生</h1>
        <p className="text-sm text-slate-500">先填写基本信息；成绩和目标成绩可在学生详情页继续补充。</p>
      </div>
      <ErrorBanner error={error} />
      <div className="card p-6">
        <StudentForm action={createStudentAction} submitLabel="创建并进入档案" />
      </div>
    </div>
  );
}
