import type { StudentRow } from "@/lib/repo";

export function StudentForm({ student, action, submitLabel }: { student?: StudentRow | null; action: (fd: FormData) => Promise<void>; submitLabel: string }) {
  const s = student;
  return (
    <form action={action} className="space-y-5">
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="姓名 *">
          <input name="name" required defaultValue={s?.name ?? ""} className="input" placeholder="如：李明" />
        </Field>
        <Field label="性别 *">
          <select name="gender" defaultValue={s?.gender ?? "male"} className="input">
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </Field>
        <Field label="出生日期">
          <input name="birthDate" type="date" defaultValue={s?.birthDate ?? ""} className="input" />
        </Field>
        <Field label="身高 (cm)">
          <input name="height" type="number" step="0.1" min="100" max="230" defaultValue={s?.height ?? ""} className="input" placeholder="175" />
        </Field>
        <Field label="体重 (kg)">
          <input name="weight" type="number" step="0.1" min="30" max="200" defaultValue={s?.weight ?? ""} className="input" placeholder="65" />
        </Field>
        <Field label="训练年限（年）">
          <input name="trainingYears" type="number" step="0.5" min="0" max="10" defaultValue={s?.trainingYears ?? ""} className="input" placeholder="1" />
        </Field>
        <Field label="体育高考日期">
          <input name="examDate" type="date" defaultValue={s?.examDate ?? ""} className="input" />
          <p className="mt-1 text-xs text-slate-400">用于倒推训练周期，必填更准确</p>
        </Field>
        <Field label="目标院校 / 总分（备注）">
          <input name="goalNote" defaultValue={s?.goalNote ?? ""} className="input" placeholder="如：目标 XX 大学，术科 250 分" />
        </Field>
        <Field label="伤病史 / 注意事项">
          <input name="injuryNote" defaultValue={s?.injuryNote ?? ""} className="input" placeholder="如：左膝旧伤，避免大强度跳跃" />
        </Field>
      </div>
      <Field label="其他备注">
        <textarea name="note" rows={3} defaultValue={s?.note ?? ""} className="input" placeholder="训练习惯、文化课安排、可训练时段等" />
      </Field>
      <button type="submit" className="btn btn-primary">{submitLabel}</button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
