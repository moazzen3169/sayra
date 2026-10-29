import React, { ReactNode } from "react";
import Link from "next/link";
import { Icon, IconName } from "@/components/ui/Icon";

export interface AdminPlaceholderPageProps {
  title: string;
  description: string;
  iconName: IconName;
  actions?: ReactNode;
}

export const AdminPlaceholderPage: React.FC<AdminPlaceholderPageProps> = ({
  title,
  description,
  iconName,
  actions,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-page-title text-text-white">{title}</h1>
          <p className="text-secondary text-text-muted mt-1">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>

      <div className="bg-card-bg border border-border rounded-card p-8 md:p-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-primary-muted text-primary flex items-center justify-center mb-4">
          <Icon name={iconName} size={32} />
        </div>
        <h2 className="text-section-title text-text-white mb-2">
          بخش {title}
        </h2>
        <p className="text-body text-text-muted max-w-md mb-6 leading-relaxed">
          این بخش در زیرساخت پنل مدیریت ثبت شده است و امکانات مدیریتی مربوط به
          آن در فازهای بعدی فعال خواهد شد.
        </p>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-foreground/30 border border-border text-secondary text-text-muted mb-6">
          <span className="w-2 h-2 rounded-full bg-accent-star" />
          <span>وضعیت: آماده‌سازی اولیه زیرساخت</span>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-card bg-foreground hover:bg-foreground/80 text-text-white text-button transition-colors"
        >
          <Icon name="back" size={16} />
          <span>بازگشت به داشبورد</span>
        </Link>
      </div>
    </div>
  );
};
