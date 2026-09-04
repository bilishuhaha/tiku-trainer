"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * 带“进行中”反馈的提交按钮：点击后立刻变灰并显示加载文案，
 * 避免跨区网络 / AI 生成期间页面看起来“卡住没反应”。
 * 用法：放在 <form action={serverAction}> 内部替代原 <button type="submit">。
 */
export default function PendingSubmitButton({
  children,
  pendingText,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-4 w-4 animate-spin" /> {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
