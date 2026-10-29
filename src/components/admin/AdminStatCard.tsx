import React from "react";
import { Icon, IconName } from "@/components/ui/Icon";

export interface AdminStatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  iconName?: IconName | string;
  className?: string;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  unit,
  description,
  iconName,
  className = "",
}) => {
  return (
    <div
      className={`bg-card-bg border border-border rounded-card p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-secondary text-text-muted">{title}</span>
        {iconName && (
          <div className="w-9 h-9 rounded-full bg-primary-muted flex items-center justify-center text-primary shrink-0">
            <Icon name={iconName as IconName} size={18} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-key-number text-text-white">{value}</span>
          {unit && (
            <span className="text-secondary text-text-muted">{unit}</span>
          )}
        </div>
        {description && (
          <p className="text-secondary text-text-subtle mt-1.5 line-clamp-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
