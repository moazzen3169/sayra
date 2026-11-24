"use client";

import { useState } from "react";

export interface RecoveryCodesPanelProps {
  codes: string[];
  title?: string;
  description?: string;
  filename?: string;
}

export function RecoveryCodesPanel({
  codes,
  title = "کدهای بازیابی یکبارمصرف (Recovery Codes)",
  description = "این کدها فقط یک‌بار نمایش داده می‌شوند. در صورت از دست دادن دسترسی به اپلیکیشن Authenticator، هر کد برای یک‌بار ورود اضطراری قابل استفاده است.",
  filename = "sayra-admin-recovery-codes.txt",
}: RecoveryCodesPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored if clipboard permission denied
    }
  };

  const handleDownload = () => {
    const header = [
      "Sayra Platform Admin - Single-Use 2FA Recovery Codes",
      `Generated: ${new Date().toISOString()}`,
      "Keep these codes in a secure offline location. Each code can only be used once.",
      "--------------------------------------------------",
      "",
    ].join("\n");

    const blob = new Blob([header + codes.join("\n") + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-right">
        <p className="text-sm font-bold text-amber-300">{title}</p>
        <p className="mt-1 text-xs leading-6 text-amber-200/85">
          {description}
        </p>
      </div>

      <div
        dir="ltr"
        className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-700 bg-slate-950/70 p-4 font-mono text-sm text-slate-100"
      >
        {codes.map((code, index) => (
          <div
            key={`${code}-${index}`}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2"
          >
            <span className="text-[11px] text-slate-500">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-semibold tracking-wider select-all">
              {code}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleCopyAll}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          {copied ? "کدها کپی شدند ✓" : "کپی همه کدها"}
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          دانلود فایل متنی (.txt)
        </button>
      </div>
    </div>
  );
}
