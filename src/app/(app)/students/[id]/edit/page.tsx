import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { findStudent } from "@/lib/repo";
import { StudentForm } from "@/components/student-form";
import { updateStudentAction } from "@/lib/actions";
import { ErrorBanner } from "@/components/error-banner";

export default async function EditStudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await requireUser();
  const student = await findStudent(id, user.id);
  if (!student) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/students/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 返回 {student.name} 档案
      </Link>
      <h1 className="text-xl font-bold text-slate-900">编辑：{student.name}</h1>
      <ErrorBanner error={error} />
      <div className="card p-6">
        <StudentForm student={student} action={updateStudentAction} submitLabel="保存修改" />
      </div>
    </div>
  );
}
