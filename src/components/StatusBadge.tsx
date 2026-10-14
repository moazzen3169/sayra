import React from "react";
import { getStatusUi } from "@/lib/reservationUi";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "sm" }) => {
  const ui = getStatusUi(status);
  return (
    <span
      className={`inline-flex items-center shrink-0 rounded-child px-2.5 pt-1 pb-0.5 font-bold ${
        size === "md" ? "text-xs" : "text-[10px]"
      } ${ui.className}`}
    >
      {ui.label}
    </span>
  );
};