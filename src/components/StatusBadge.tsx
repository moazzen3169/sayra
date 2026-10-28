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
      className={`inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-xs font-bold leading-none ${ui.className}`}
    >
      {ui.label}
    </span>
  );
};