"use client";

import type { ReactNode } from "react";

interface ConfirmFormProps {
  action: (fd: FormData) => Promise<void>;
  message: string;
  children: ReactNode;
  className?: string;
}

/** 删除等危险操作：提交前二次确认（客户端确认后走原生表单提交） */
export function ConfirmForm({ action, message, children, className }: ConfirmFormProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

export function PrintButton({ label = "打印 / 导出 PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-outline">
      {label}
    </button>
  );
}
