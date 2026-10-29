"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";

export const FutureFeaturesRoadmapCard: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const futureFeatures = [
    {
      id: "free_slot",
      title: "رزرو رایگان در زمان‌های خاص",
      description: "تعریف سانس‌های طلایی و زمان‌های کم‌رفت‌وآمد جهت رزرو کاملاً رایگان یا با ۱۰۰٪ تخفیف برای ترویج پلتفرم.",
      status: "در حال بررسی فنی (Roadmap)",
      badgeVariant: "neutral" as const,
    },
    {
      id: "special_stations",
      title: "تخصیص جایگاه‌های ویژه VIP",
      description: "امکان رزرو اختصاصی صندلی‌ها و اتاق‌های گیمینگ VIP به همراه خدمات افزوده برای اعضای ویژه.",
      status: "نیاز به زیرساخت تجهیزات (Roadmap)",
      badgeVariant: "neutral" as const,
    },
    {
      id: "loyalty_points",
      title: "سیستم امتیاز، پاداش و باشگاه مشتریان",
      description: "اعطای امتیاز به ازای هر رزرو، تبدیل امتیاز به بن تخفیف و رتبه‌بندی کاربران در سطوح برنزی، نقره‌ای و طلایی.",
      status: "برنامه‌ریزی نسخه بعدی (Roadmap)",
      badgeVariant: "neutral" as const,
    },
  ];

  return (
    <div className="bg-card-bg border border-border rounded-card p-5 transition-all">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Icon name="star" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body font-bold text-text-white">
                نقشه راه و قابلیت‌های آتی کمپین‌ها
              </h3>
              <Badge variant="primary">
                آینده
              </Badge>
            </div>
            <p className="text-secondary text-text-subtle text-xs mt-0.5">
              قابلیت‌های پیشرفته رزرو رایگان، تخصیص صندلی ویژه و سیستم امتیازدهی
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-2 text-text-muted hover:text-text-white transition-colors"
        >
          <Icon name="chevron" size={20} className={isExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-4">
          {futureFeatures.map((feat) => (
            <div
              key={feat.id}
              className="p-4 rounded-card bg-foreground/20 border border-border-subtle flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-text-white">{feat.title}</h4>
                  <Badge variant={feat.badgeVariant}>
                    آتی
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {feat.description}
                </p>
              </div>
              <div className="pt-2 border-t border-border-subtle flex items-center gap-1.5 text-[11px] text-text-subtle font-medium">
                <Icon name="info" size={14} />
                <span>{feat.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
