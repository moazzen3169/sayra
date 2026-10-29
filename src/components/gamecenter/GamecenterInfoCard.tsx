"use client";

import React, { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/format";
import { mapsUrl } from "@/lib/reservationUi";

interface GamecenterInfoCardProps {
  title: string;
  address?: string;
  rating: { avg: number; count: number } | null;
  gamesCount: number;
  reviewsCount: number;
  onScrollTo: (id: string) => void;
}

const Chip: React.FC<{
  onClick?: () => void;
  href?: string;
  icon: React.ReactNode;
  label: string;
}> = ({ onClick, href, icon, label }) => {
  const cls =
    "shrink-0 h-8 px-3 rounded-full bg-[var(--foreground)]/50 border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] flex items-center gap-1.5 hover:border-[var(--primary)]/60 hover:text-[var(--primary)] transition-colors active:scale-95";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {icon}
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      <span>{label}</span>
    </button>
  );
};

const iconProps = {
  className: "w-3.5 h-3.5 text-[var(--primary)]",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const GamecenterInfoCard: React.FC<GamecenterInfoCardProps> = ({
  title,
  address,
  rating,
  gamesCount,
  reviewsCount,
  onScrollTo,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  // قفل اسکرول + Escape برای Sheet
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const goTo = (id: string) => {
    setSheetOpen(false);
    // کمی تأخیر تا قفل اسکرول آزاد شود
    setTimeout(() => onScrollTo(id), 80);
  };

  return (
    <>
      {/* ===== کارت فشرده: روی گالری کمی همپوشانی دارد ===== */}
      <section className="relative z-10  flex-col gap-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight truncate">
              {title}
            </h1>

            {address && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="mt-1 w-full flex items-center gap-1 text-right text-xs text-[var(--text-muted)] hover:text-[var(--text-white)] transition-colors"
                aria-label="مشاهده اطلاعات کامل گیمنت"
              >
                <svg
                  {...iconProps}
                  className="w-3.5 h-3.5 shrink-0 text-[var(--text-subtle)]"
                >
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{address}</span>
                <svg
                  {...iconProps}
                  className="w-3 h-3 shrink-0 text-[var(--text-subtle)] rotate-90"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {rating && (
            <button
              type="button"
              onClick={() => onScrollTo("reviews")}
              className="shrink-0 flex flex-col items-end justify-center  px-2.5 py-1.5 hover:bg-[var(--primary)]/25 transition-colors"
              aria-label={`امتیاز ${rating.avg.toFixed(1)} از ${rating.count} دیدگاه`}
            ><span className="text-[24px] flex items-end justify-start font-black text-[var(--primary)] leading-none pt-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="27"
                  height="27"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="pb-1"
                >
                  <path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z" />
                </svg>

                {toPersianDigits(rating.avg.toFixed(1))}
              </span>
              <span className="text-xs text-[var(--text-muted)] mt-1">
                {toPersianDigits(rating.count)} دیدگاه
              </span>
            </button>
          )}
        </div>

        {/* چیپ‌های میان‌بر؛ یک ردیف اسکرول‌پذیر کم‌ارتفاع */}
        <div className="-mx-1 px-1 flex items-center gap-2 overflow-x-auto">
          {address && (
            <Chip
              href={mapsUrl(address)}
              label="مسیریابی"
              icon={
                <svg {...iconProps}>
                  <path d="M9 14L4 9l5-5" />
                  <path d="M4 9h10a6 6 0 016 6v5" />
                </svg>
              }
            />
          )}
          {gamesCount > 0 && (
            <Chip
              onClick={() => onScrollTo("games")}
              label={`${toPersianDigits(gamesCount)} بازی`}
              icon={
                <svg {...iconProps}>
                  <path d="M6 12h4m-2-2v4m7-3h.01M18 13h.01M7 6h10a4 4 0 014 4v5a3 3 0 01-5.2 2l-1.3-1.5h-4l-1.3 1.5A3 3 0 013 15v-5a4 4 0 014-4z" />
                </svg>
              }
            />
          )}
          {reviewsCount > 0 && (
            <Chip
              onClick={() => onScrollTo("reviews")}
              label="نظرات"
              icon={
                <svg {...iconProps}>
                  <path d="M8 10h8M8 14h5m-9 6l3-3h11a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
                </svg>
              }
            />
          )}
          <Chip
            onClick={() => setSheetOpen(true)}
            label="اطلاعات بیشتر"
            icon={
              <svg {...iconProps}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8h.01M11 12h1v4h1" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ===== Bottom Sheet: اطلاعات کامل ===== */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn sm:p-4"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="اطلاعات گیمنت"
            className="animate-sheetUp w-full sm:max-w-[480px] max-h-[85dvh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card p-5 flex flex-col gap-4 shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold">{title}</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="بستن"
                className="w-8 h-8 shrink-0 rounded-full bg-[var(--foreground)]/50 text-[var(--text-muted)] hover:text-[var(--text-white)]"
              >
                ✕
              </button>
            </div>

            {rating && (
              <button
                type="button"
                onClick={() => goTo("reviews")}
                className="flex items-center justify-between rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] p-3"
              >
                <span className="text-xs text-[var(--text-muted)]">
                  امتیاز کاربران
                </span>
                <span className="text-sm font-bold text-[var(--accent-star)]">
                  ★ {toPersianDigits(rating.avg.toFixed(1))}
                  <span className="text-xs font-normal text-[var(--text-muted)] mr-1">
                    ({toPersianDigits(rating.count)} دیدگاه)
                  </span>
                </span>
              </button>
            )}

            {address && (
              <div className="flex flex-col gap-2 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] p-3">
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  آدرس
                </span>
                <p className="text-sm leading-relaxed">{address}</p>
                <a
                  href={mapsUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  مسیریابی تا گیمنت
                </a>
              </div>
            )}

            {gamesCount > 0 && (
              <button
                type="button"
                onClick={() => goTo("games")}
                className="h-11 rounded-card bg-[var(--foreground)] text-[var(--text-white)] text-sm font-bold"
              >
                مشاهده بازی‌های گیمنت ({toPersianDigits(gamesCount)})
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
