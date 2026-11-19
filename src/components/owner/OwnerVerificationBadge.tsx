"use client";

import React from "react";
import Link from "next/link";
import { useOwner } from "@/context/OwnerContext";
import type { VerificationStatus } from "@/types/owner";

export const getVerificationStatusInfo = (status: VerificationStatus) => {
  switch (status) {
    case "APPROVED":
      return {
        label: "فعال • تایید شده",
        shortLabel: "تایید شده",
        description: "گیم‌نت شما تایید شده و برای کاربران فعال است.",
        colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
        dotClass: "bg-emerald-400",
      };
    case "PENDING":
      return {
        label: "غیرفعال • در حال انتظار",
        shortLabel: "در حال انتظار",
        description: "درخواست احراز هویت ارسال شده و در انتظار بررسی ادمین است.",
        colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
        dotClass: "bg-amber-400 animate-pulse",
      };
    case "REJECTED":
      return {
        label: "غیرفعال • لغو شده",
        shortLabel: "لغو شده",
        description: "درخواست احراز هویت لغو (رد) شده است. برای مشاهده دلیل کلیک کنید.",
        colorClass: "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/20",
        dotClass: "bg-[var(--accent-red)]",
      };
    case "NOT_SUBMITTED":
    default:
      return {
        label: "غیرفعال • تایید نشده",
        shortLabel: "غیرفعال",
        description: "گیم‌نت غیرفعال است. برای فعال‌سازی، احراز هویت را تکمیل کنید.",
        colorClass: "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/20",
        dotClass: "bg-[var(--accent-red)]",
      };
  }
};

export const OwnerVerificationBadge: React.FC<{
  size?: "sm" | "md";
  linked?: boolean;
}> = ({ size = "sm", linked = true }) => {
  const { verificationStatus, isVerificationLoading } = useOwner();
  const info = getVerificationStatusInfo(verificationStatus);

  const badgeClasses = `inline-flex items-center gap-1.5 border rounded-full font-bold transition-colors whitespace-nowrap ${info.colorClass} ${
    size === "md" ? "px-3.5 py-1.5 text-xs" : "px-2.5 sm:px-3.5 h-8 sm:h-9 text-[11px] sm:text-xs"
  }`;

  const content = (
    <>
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isVerificationLoading ? "bg-[var(--text-muted)] animate-pulse" : info.dotClass
        }`}
      />
      <span className="sm:hidden">{info.shortLabel}</span>
      <span className="hidden sm:inline">{info.label}</span>
    </>
  );

  if (!linked) {
    return (
      <div className={badgeClasses} title={info.description}>
        {content}
      </div>
    );
  }

  return (
    <Link href="/owner/verification" className={badgeClasses} title={info.description}>
      {content}
    </Link>
  );
};
