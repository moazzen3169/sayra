import React from "react";
import { formatPrice } from "@/lib/format";

export interface AnalyticsChartProps {
  title: string;
  subtitle?: string;
  unit: string;
  timePeriod: string;
  guideText?: string;
  data: {
    label: string;
    value: number;
    secondaryValue?: number;
    date?: string;
  }[];
  type?: "line" | "bar";
  isCurrency?: boolean;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  title,
  subtitle,
  unit,
  timePeriod,
  guideText,
  data,
  type = "bar",
  isCurrency = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-card p-5 text-center text-text-muted py-12">
        داده‌ای برای ترسیم نمودار وجود ندارد.
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 1);

  return (
    <div className="bg-card-bg border border-border rounded-card p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-subtle pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-section-title text-text-white font-bold">{title}</h3>
            <span className="text-xs bg-primary-muted text-primary px-2 py-0.5 rounded-full font-medium">
              واحد: {unit}
            </span>
          </div>
          {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
        </div>

        <div className="text-xs text-text-subtle bg-foreground/30 border border-border-subtle px-2.5 py-1 rounded self-start sm:self-auto font-mono">
          بازه: {timePeriod}
        </div>
      </div>

      {/* Visual Chart Bars */}
      <div className="space-y-3.5 my-2">
        {data.map((item, idx) => {
          const mainPercent = Math.round((item.value / maxValue) * 100);
          const secPercent = item.secondaryValue
            ? Math.round((item.secondaryValue / maxValue) * 100)
            : 0;

          return (
            <div key={idx} className="group relative">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-text-white font-bold">{item.label}</span>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-primary font-bold">
                    {isCurrency ? formatPrice(item.value) : item.value.toLocaleString("fa-IR")}
                  </span>
                  {item.secondaryValue !== undefined && (
                    <span className="text-text-muted">
                      تکمیل‌شده:{" "}
                      {isCurrency
                        ? formatPrice(item.secondaryValue)
                        : item.secondaryValue.toLocaleString("fa-IR")}
                    </span>
                  )}
                </div>
              </div>

              {type === "bar" ? (
                <div className="w-full bg-foreground/30 h-3.5 rounded-full overflow-hidden p-0.5 border border-border-subtle/30 relative">
                  {/* Secondary bar under layer if present */}
                  {item.secondaryValue !== undefined && (
                    <div
                      className="bg-accent-green/80 h-full rounded-full absolute top-0.5 right-0.5 transition-all duration-500"
                      style={{ width: `${secPercent}%` }}
                    />
                  )}
                  {/* Primary bar */}
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500 relative z-10"
                    style={{
                      width: `${mainPercent}%`,
                      opacity: item.secondaryValue !== undefined ? 0.85 : 1,
                    }}
                  />
                </div>
              ) : (
                /* Line / Dot Visual Representation */
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-foreground/30 h-1.5 rounded-full relative overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{ width: `${mainPercent}%` }}
                    />
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reading Guide Footer */}
      {guideText && (
        <div className="mt-4 pt-3 border-t border-border-subtle/50 text-[11px] text-text-subtle flex items-center gap-1.5">
          <span className="font-bold text-primary">راهنمای خواندن:</span>
          <span>{guideText}</span>
        </div>
      )}
    </div>
  );
};
