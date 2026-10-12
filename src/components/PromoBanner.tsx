import React from "react";

export interface PromoBannerProps {
  title?: string;
  subtitle?: string;
  discountBadge?: string;
  buttonText?: string;
  onClick?: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  title = "تخفیف ویژه رزرو اول با سایرا",
  subtitle = "تا ۳۰٪ تخفیف روی تمامی گیمنت‌های منتخب شهر",
  discountBadge = "۳۰٪",
  buttonText = "مشاهده و رزرو",
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="relative w-full rounded-card overflow-hidden bg-gradient-to-l from-[#2A2A32] via-[var(--bg-card)] to-[#18181C] border border-[var(--border-subtle)] p-4 flex items-center justify-between cursor-pointer transition-all hover:border-[var(--primary)]/40 group"
    >
      {/* Glow Effect */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col gap-1.5 z-10 max-w-[70%]">
        <div className="flex items-center gap-2">
          <span className="bg-[var(--primary)] text-[#101014] text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
            {discountBadge}
          </span>
          <span className="text-xs font-bold text-[var(--primary)]">اطلاع‌رسانی تخفیف</span>
        </div>
        <h3 className="text-base font-extrabold text-[var(--text-white)] group-hover:text-[var(--primary)] transition-colors leading-snug">
          {title}
        </h3>
        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{subtitle}</p>

        {buttonText && (
          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
            <span>{buttonText}</span>
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        )}
      </div>

      {/* Decorative Icon / Illustration */}
      <div className="z-10 relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--foreground)]/40 border border-[var(--border-color)] shrink-0">
        <svg className="w-9 h-9 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 13C10.832 21 2 20 2 12c0-4.5 3.5-8 8-8h2c4.5 0 8 3.5 8 8 0 8-8.832 9-10 9z" />
        </svg>
      </div>
    </div>
  );
};
