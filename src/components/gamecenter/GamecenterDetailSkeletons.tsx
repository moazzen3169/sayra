import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/**
 * اسکلتون‌های بخش‌به‌بخش صفحه جزئیات گیمنت.
 * هر اسکلتون دقیقاً همان کلاس‌های ابعادی (padding، aspect، ارتفاع خطوط و gap)
 * المان واقعی را دارد تا هنگام جایگزینی هیچ پرش چیدمانی رخ ندهد.
 *
 * ارتفاع خطوط متن (از globals.css):
 *  - text-section-title / text-base  → 24px  (h-6)
 *  - text-card-title / text-body     → 22px  (h-[22px])
 *  - text-secondary / lg:text-sm     → 20px  (h-5)
 */

/** یک خط متن با ارتفاع line-height و نوار کم‌ارتفاع‌تر داخل آن (شبیه متن واقعی) */
const TextLine: React.FC<{ lineClass: string; barClass?: string; className?: string }> = ({
  lineClass,
  barClass = "h-3",
  className,
}) => (
  <div className={cn("flex items-center", lineClass, className)}>
    <Skeleton className={cn("w-full rounded-full", barClass)} />
  </div>
);

/* ----------------------------- اطلاعات گیمنت ----------------------------- */

export const InfoCardSkeleton: React.FC = () => (
  <section className="flex flex-col gap-1.5" aria-hidden="true">
    {/* ردیف عنوان + امتیاز (دکمه امتیاز min-h-[44px] دارد) */}
    <div className="flex min-h-[44px] items-center justify-between gap-3">
      <TextLine lineClass="h-6" barClass="h-4" className="w-2/5" />
      <TextLine lineClass="h-[22px]" barClass="h-3.5" className="w-24 px-2" />
    </div>
    {/* آدرس */}
    <div className="flex items-start gap-1.5 lg:gap-2">
      <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
      <TextLine lineClass="h-5" className="flex-1" />
      <TextLine lineClass="h-5" className="w-16 shrink-0" />
    </div>
  </section>
);

/* ------------------------------- موقعیت ------------------------------- */

export const LocationSkeleton: React.FC = () => (
  <div className="flex items-center gap-2 lg:gap-3" aria-hidden="true">
    <Skeleton className="h-8 w-[118px] lg:h-11 lg:w-[150px]" />
    <Skeleton className="h-8 w-[88px] lg:h-11 lg:w-[120px]" />
  </div>
);

/* --------------------------- کارت رزرو دسکتاپ --------------------------- */

export const BookingCardSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="hidden lg:flex sticky top-20 self-start flex-col gap-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 lg:p-6 lg:gap-6 w-full"
  >
    <TextLine lineClass="h-5" className="w-32" />
    <Skeleton className="h-12 w-full" />
  </div>
);

/* ------------------------------ دستگاه‌ها ------------------------------ */

/** دسکتاپ: دو کارت هم‌اندازه با کارت‌های اسلایدر */
const DesktopDeviceCardSkeleton: React.FC = () => (
  <div className="flex w-full flex-col overflow-hidden rounded-card border-2 border-[var(--border-subtle)] bg-[var(--bg-card)]">
    <Skeleton className="aspect-[16/9] w-full rounded-none!" />
    <div className="flex items-center justify-between gap-3 p-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <TextLine lineClass="h-[22px]" barClass="h-3.5" className="w-1/2" />
        <TextLine lineClass="h-5" className="w-1/3" />
      </div>
      <Skeleton className="h-9 w-[76px] shrink-0 rounded-full" />
    </div>
  </div>
);

/** موبایل/تبلت: هم‌اندازه با کارت‌های گرید */
const MobileDeviceCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "flex h-full w-full flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3",
      className
    )}
  >
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="flex min-w-0 flex-col gap-1">
      <TextLine lineClass="h-[22px]" barClass="h-3.5" className="w-3/4" />
      <TextLine lineClass="h-5" className="w-1/2" />
    </div>
  </div>
);

export const DevicePickerSkeleton: React.FC = () => (
  <div className="w-full" aria-busy="true">
    <span className="sr-only">در حال بارگذاری</span>
    {/* دسکتاپ — همان ساختار CarouselContent(-mr-3) / CarouselItem(basis-1/2 pr-3) */}
    <div className="hidden lg:block overflow-hidden" aria-hidden="true">
      <div className="flex -mr-3">
        {[0, 1].map((i) => (
          <div key={i} className="min-w-0 shrink-0 grow-0 basis-1/2 pr-3">
            <DesktopDeviceCardSkeleton />
          </div>
        ))}
      </div>
    </div>
    {/* موبایل و تبلت */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden w-full" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <MobileDeviceCardSkeleton key={i} className={i >= 4 ? "hidden sm:flex" : undefined} />
      ))}
    </div>
  </div>
);

/* ------------------------------- بازی‌ها ------------------------------- */

export const GamesSectionSkeleton: React.FC = () => (
  <section className="flex flex-col gap-3" aria-busy="true">
    <span className="sr-only">در حال بارگذاری بازی‌ها</span>
    {/* SectionTitle: h2 text-base → 24px */}
    <TextLine lineClass="h-6" barClass="h-4" className="w-16" />
    <div className="flex w-full flex-col gap-4" aria-hidden="true">
      {/* جستجو + فلش‌ها */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-11 flex-1" />
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <Skeleton className="h-11 w-11 lg:rounded-full!" />
          <Skeleton className="h-11 w-11 lg:rounded-full!" />
        </div>
      </div>
      {/* پوسترها — همان basis و aspect اسلایدر واقعی */}
      <div className="pb-2 overflow-hidden">
        <div className="flex gap-3 lg:gap-0 -mr-3 lg:-mr-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="min-w-0 shrink-0 grow-0 pr-3 lg:pr-4 basis-[36%] sm:basis-[140px] lg:basis-[112px]"
            >
              <Skeleton className="w-full aspect-[3/4] lg:aspect-[3/5] border border-[var(--border-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* -------------------------------- نظرات -------------------------------- */

/** تعداد خطوط متن نظر برای هر کارت تا حالت پینترستی طبیعی دیده شود */
const REVIEW_LINES = [2, 4, 1, 3];

export const ReviewsListSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 lg:block lg:columns-3 lg:gap-3" aria-busy="true">
    <span className="sr-only">در حال بارگذاری نظرات</span>
    {REVIEW_LINES.map((lines, i) => (
      <div
        key={i}
        aria-hidden="true"
        className="bg-[var(--bg-card)] rounded-card p-4 border border-[var(--border-subtle)] flex flex-col gap-2 lg:mb-3 lg:break-inside-avoid"
      >
        {/* سرتیتر: آواتار + نام / امتیاز */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Skeleton className="w-6 h-6 shrink-0 rounded-child" />
            <TextLine lineClass="h-[22px]" barClass="h-3.5" className="w-24" />
          </div>
          <TextLine lineClass="h-4" barClass="h-3" className="w-9 shrink-0" />
        </div>
        {/* متن نظر: text-body leading-relaxed → 22.75px در هر خط */}
        <div className="flex flex-col">
          {Array.from({ length: lines }).map((_, l) => (
            <TextLine
              key={l}
              lineClass="h-[22.75px]"
              className={l === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}
            />
          ))}
        </div>
        {/* تاریخ */}
        <TextLine lineClass="h-5" className="w-20" />
      </div>
    ))}
  </div>
);
