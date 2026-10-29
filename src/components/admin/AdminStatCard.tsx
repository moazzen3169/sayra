import React, { useState } from "react";
import { Icon, IconName } from "@/components/ui/Icon";

export interface AdminStatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  iconName?: IconName | string;
  changePercent?: number;
  changeLabel?: string;
  isAvailable?: boolean;
  unavailableReason?: string;
  definitionFormula?: string;
  className?: string;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  unit,
  description,
  iconName,
  changePercent,
  changeLabel = "دوره قبل",
  isAvailable = true,
  unavailableReason,
  definitionFormula,
  className = "",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const isPositive = changePercent !== undefined && changePercent > 0;
  const isNegative = changePercent !== undefined && changePercent < 0;

  return (
    <div
      className={`bg-card-bg border border-border rounded-card p-5 flex flex-col justify-between relative ${className}`}
    >
      {/* Header: Title and Icon */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-secondary text-text-muted font-medium">{title}</span>
          {(description || definitionFormula || unavailableReason) && (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-text-subtle hover:text-primary transition-colors focus:outline-none p-0.5"
                aria-label="اطلاعات شاخص"
              >
                <Icon name="info" size={14} />
              </button>

              {showTooltip && (
                <div className="absolute right-0 bottom-full mb-2 w-64 p-2.5 bg-foreground border border-border-subtle rounded-card shadow-lg text-xs z-30 text-text-muted">
                  {description && <p className="mb-1 text-text-white">{description}</p>}
                  {definitionFormula && (
                    <p className="font-mono text-[10px] text-primary bg-background/50 p-1 rounded dir-ltr text-left border border-border-subtle">
                      {definitionFormula}
                    </p>
                  )}
                  {!isAvailable && unavailableReason && (
                    <p className="text-accent-red font-medium mt-1">{unavailableReason}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {iconName && (
          <div className="w-9 h-9 rounded-full bg-primary-muted flex items-center justify-center text-primary shrink-0">
            <Icon name={iconName as IconName} size={18} />
          </div>
        )}
      </div>

      {/* Main Value Body */}
      {!isAvailable ? (
        <div className="my-1">
          <div className="text-body font-bold text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-md px-2.5 py-1.5 inline-block text-xs">
            اطلاعات در دسترس نیست
          </div>
          {unavailableReason && (
            <p className="text-xs text-text-subtle mt-1.5 line-clamp-2">{unavailableReason}</p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-key-number text-text-white font-bold">{value}</span>
            {unit && <span className="text-secondary text-text-muted text-xs">{unit}</span>}
          </div>

          {changePercent !== undefined && (
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span
                className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded dir-ltr ${
                  isPositive
                    ? "bg-accent-green/10 text-accent-green"
                    : isNegative
                    ? "bg-accent-red/10 text-accent-red"
                    : "bg-foreground/40 text-text-muted"
                }`}
              >
                {isPositive ? "↑ +" : isNegative ? "↓ " : ""}
                {Math.abs(changePercent)}%
              </span>
              <span className="text-text-subtle">مقایسه با {changeLabel}</span>
            </div>
          )}

          {description && changePercent === undefined && (
            <p className="text-secondary text-text-subtle mt-1.5 line-clamp-1">{description}</p>
          )}
        </div>
      )}
    </div>
  );
};
