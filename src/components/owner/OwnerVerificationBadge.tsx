"use client";

import React from "react";
import { useOwner } from "@/context/OwnerContext";
import type { VerificationStatus } from "@/types/owner";

export const getVerificationStatusInfo = (status: VerificationStatus) => {
  switch (status) {
    case "APPROVED":
      return {
        label: "تایید شده",
        colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        dotClass: "bg-emerald-400",
      };
    case "PENDING":
      return {
        label: "در صف انتظار",
        colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        dotClass: "bg-amber-400 animate-pulse",
      };
    case "REJECTED":
      return {
        label: "تایید نشده",
        colorClass: "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30",
        dotClass: "bg-[var(--accent-red)]",
      };
    case "NOT_SUBMITTED":
    default:
      return {
        label: "احراز هویت نشده",
        colorClass: "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30",
        dotClass: "bg-[var(--accent-red)]",
      };
  }
};

export const OwnerVerificationBadge: React.FC<{ size?: "sm" | "md" }> = ({ size = "sm" }) => {
  const { verificationStatus } = useOwner();
  const info = getVerificationStatusInfo(verificationStatus);

  return (
    <div
      className={`inline-flex items-center gap-1.5 border rounded-full font-extrabold ${info.colorClass} ${
        size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
      <span>{info.label}</span>
    </div>
  );
};
