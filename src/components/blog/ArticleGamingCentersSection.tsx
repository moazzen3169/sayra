import Link from "next/link";
import type {
  ArticleGamingCentersSectionData,
  PublicGameCenterCard,
} from "@/types/blog";

const AMENITY_LABELS: Record<string, string> = {
  food_service: "سرویس غذا و کافه",
  vip: "سالن VIP",
  online_booking: "رزرو آنلاین",
  online_games: "بازی آنلاین",
  extra_controllers: "دسته اضافه",
};

function formatPriceIrt(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "مشاهده تعرفه در صفحه مرکز";
  }
  return `از ${Math.round(amount).toLocaleString("fa-IR")} تومان / ساعت`;
}

function formatPersianDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return iso;
  }
}

function getDeviceBadges(center: PublicGameCenterCard): string[] {
  const badges: string[] = [];
  if (Array.isArray(center.devices) && center.devices.length > 0) {
    for (const dev of center.devices) {
      if (dev.count > 0) {
        badges.push(`${dev.type} (${dev.count.toLocaleString("fa-IR")})`);
      }
    }
  } else {
    if (center.pcCount > 0) badges.push(`PC (${center.pcCount.toLocaleString("fa-IR")})`);
    if (center.consoleCount > 0) {
      badges.push(`کنسول (${center.consoleCount.toLocaleString("fa-IR")})`);
    }
  }
  return badges.slice(0, 4);
}

function GamingCenterCardItem({
  center,
  rankNumber,
  isNewlyRegistered = false,
}: {
  center: PublicGameCenterCard;
  rankNumber?: number | null;
  isNewlyRegistered?: boolean;
}) {
  const locationText = [center.city, center.neighborhood]
    .filter(Boolean)
    .join(" · ");
  const deviceBadges = getDeviceBadges(center);
  const formattedUpdated = formatPersianDateTime(center.updatedAt ?? null);
  const coverSrc = center.images.coverUrl || "/img/gamnet-1.webp";

  return (
    <article
      className="group flex flex-col justify-between gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-4 transition-colors hover:border-[var(--primary)]/60 sm:flex-row"
      data-gaming-center-id={center.id}
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row">
        <Link
          href={center.detailUrl}
          className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)]/70 bg-[var(--bg-card)] sm:h-36 sm:w-44"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverSrc}
            alt={center.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {typeof rankNumber === "number" && rankNumber > 0 && (
            <span className="absolute right-2 top-2 rounded-full bg-[var(--primary)] px-2.5 py-0.5 text-xs font-extrabold text-black shadow">
              رتبه #{rankNumber.toLocaleString("fa-IR")}
            </span>
          )}
          {isNewlyRegistered && (
            <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-bold text-black shadow">
              تازه‌ثبت‌شده
            </span>
          )}
        </Link>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={center.detailUrl}
              className="text-base font-bold text-[var(--text-white)] transition-colors hover:text-[var(--primary)]"
            >
              {center.name}
            </Link>

            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                center.activityStatus.isTemporarilyClosed
                  ? "bg-amber-500/15 text-amber-300"
                  : center.activityStatus.isOpenNow
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-slate-500/20 text-[var(--text-muted)]"
              }`}
            >
              {center.activityStatus.isTemporarilyClosed
                ? "بسته موقت"
                : center.activityStatus.isOpenNow
                  ? "اکنون باز است"
                  : "خارج از ساعت کاری"}
            </span>
          </div>

          {(locationText || center.address) && (
            <p className="text-xs leading-6 text-[var(--text-muted)]">
              {locationText && (
                <span className="font-semibold text-[var(--text-white)]/85">
                  {locationText}
                </span>
              )}
              {locationText && center.address ? " — " : ""}
              {center.address}
            </p>
          )}

          {/* Rating & Bayesian Score */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {center.rating.validReviewsCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-1 font-bold text-amber-300">
                <span>★ {center.rating.average.toFixed(1)}</span>
                <span className="text-[11px] font-normal text-[var(--text-muted)]">
                  ({center.rating.validReviewsCount.toLocaleString("fa-IR")} نظر معتبر)
                </span>
              </span>
            ) : (
              <span className="rounded-md bg-[var(--foreground)]/60 px-2.5 py-1 text-[11px] text-[var(--text-muted)]">
                بدون نظر تأییدشده
              </span>
            )}

            {center.ranking?.isEligibleForRanking && (
              <span className="rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--primary)]">
                امتیاز Bayesian: {center.ranking.bayesianScore.toFixed(2)}
              </span>
            )}

            <span className="font-semibold text-[var(--text-white)]">
              {formatPriceIrt(center.pricing.finalPrice)}
            </span>
            {center.pricing.hasDiscount && center.pricing.discountPercentage > 0 && (
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300">
                ٪{center.pricing.discountPercentage.toLocaleString("fa-IR")} تخفیف
              </span>
            )}
          </div>

          {/* Devices & Amenities */}
          {(deviceBadges.length > 0 || center.amenities.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {deviceBadges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 py-0.5 text-[11px] text-[var(--text-white)]"
                >
                  {badge}
                </span>
              ))}
              {center.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-md bg-[var(--foreground)]/50 px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
                >
                  {AMENITY_LABELS[amenity] || amenity}
                </span>
              ))}
            </div>
          )}

          {/* Editorial note */}
          {center.customDescription && (
            <div className="mt-1 rounded-lg border-r-2 border-[var(--primary)] bg-[var(--primary)]/5 px-3 py-2 text-xs leading-6 text-[var(--text-white)]/90">
              <span className="font-bold text-[var(--primary)]">یادداشت تحریریه: </span>
              {center.customDescription}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2 border-t border-[var(--border-subtle)]/60 pt-3 sm:w-44 sm:flex-col sm:items-end sm:justify-center sm:border-r sm:border-t-0 sm:pr-4 sm:pt-0">
        {formattedUpdated && (
          <span className="text-[10px] text-[var(--text-muted)]">
            همگام‌سازی: {formattedUpdated}
          </span>
        )}
        <Link
          href={center.detailUrl}
          className="inline-flex w-full items-center justify-center rounded-card bg-[var(--primary)] px-3.5 py-2 text-center text-xs font-bold text-black transition-opacity hover:opacity-90"
        >
          مشاهده جزئیات و رزرو
        </Link>
      </div>
    </article>
  );
}

export function ArticleGamingCentersSection({
  section,
  fallbackCity,
}: {
  section?: ArticleGamingCentersSectionData | null;
  fallbackCity?: string;
}) {
  if (!section || section.mode === "none") {
    return null;
  }

  const city =
    section.methodology?.scope?.city ||
    fallbackCity ||
    section.items[0]?.city ||
    section.newlyRegistered[0]?.city ||
    "";
  const neighborhood = section.methodology?.scope?.neighborhood || "";
  const formattedSync = formatPersianDateTime(section.lastUpdatedAt);
  const minReviewsThreshold = section.methodology?.minReviews ?? 3;

  const headingTitle =
    section.mode === "auto_ranking"
      ? city
        ? `بهترین گیم‌نت‌های ${city}${neighborhood ? ` (${neighborhood})` : ""}`
        : "رتبه‌بندی هوشمند گیم‌نت‌های سایرا"
      : "گیم‌نت‌های معرفی‌شده در این مقاله";

  return (
    <section
      id="article-gaming-centers"
      dir="rtl"
      aria-label="گیم‌نت‌های مرتبط"
      className="my-8 flex flex-col gap-5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 p-4 sm:p-6"
    >
      <header className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--primary)]/15 px-3 py-1 text-[11px] font-bold text-[var(--primary)]">
              {section.mode === "auto_ranking"
                ? "رتبه‌بندی خودکار Bayesian"
                : "انتخاب تحریریه سایرا"}
            </span>
            {section.isStale && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                نمایش نسخه کش‌شده
              </span>
            )}
          </div>
          {formattedSync && (
            <span className="text-[11px] text-[var(--text-muted)]">
              آخرین همگام‌سازی: {formattedSync}
            </span>
          )}
        </div>

        <h2 className="text-lg font-extrabold text-[var(--text-white)] sm:text-xl">
          {headingTitle}
        </h2>
        <p className="text-xs leading-6 text-[var(--text-muted)]">
          اطلاعات این بخش به‌صورت زنده از سامانه رزرواسیون سایرا دریافت می‌شود و تنها مراکز فعال و احراز هویت‌شده را نمایش می‌دهد.
        </p>
      </header>

      {section.items.length === 0 && section.newlyRegistered.length === 0 ? (
        <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs leading-6 text-[var(--text-muted)]">
          در حال حاضر گیم‌نت فعال و احراز هویت‌شده‌ای مطابق فیلترهای این مقاله برای نمایش یافت نشد.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {section.items.map((center, index) => (
            <GamingCenterCardItem
              key={center.id}
              center={center}
              rankNumber={
                section.mode === "auto_ranking"
                  ? (center.ranking?.rank ?? index + 1)
                  : null
              }
            />
          ))}
        </div>
      )}

      {section.newlyRegistered.length > 0 && (
        <div className="mt-2 flex flex-col gap-3 rounded-card border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-extrabold text-amber-200 sm:text-base">
              مراکز تازه‌ثبت‌شده (خارج از رتبه‌بندی رقابتی)
            </h3>
            <p className="text-xs leading-6 text-[var(--text-muted)]">
              این گیم‌نت‌های فعال و تأییدشده هنوز به حد نصاب{" "}
              {minReviewsThreshold.toLocaleString("fa-IR")} نظر معتبر نرسیده‌اند و در بخشی مجزا معرفی می‌شوند.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {section.newlyRegistered.map((center) => (
              <GamingCenterCardItem
                key={center.id}
                center={center}
                isNewlyRegistered
              />
            ))}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)]/70 pt-3 text-xs text-[var(--text-muted)]">
        {section.methodology ? (
          <p className="leading-6">
            روش رتبه‌بندی:{" "}
            <span className="font-semibold text-[var(--text-white)]" dir="ltr">
              Bayesian Average (m={section.methodology.m}, minReviews=
              {section.methodology.minReviews}, C=
              {section.methodology.globalAverageC.toFixed(2)})
            </span>{" "}
            بر پایه {section.methodology.scopeTotalValidReviews.toLocaleString("fa-IR")} نظر معتبر روی رزروهای تکمیل‌شده.
          </p>
        ) : (
          <span>اطلاعات قیمت، امتیاز و وضعیت فعالیت مستقیماً از سایرا دریافت شده است.</span>
        )}

        {city && (
          <Link
            href={`/gamecenters/city/${encodeURIComponent(city)}`}
            className="font-bold text-[var(--primary)] hover:underline"
          >
            مشاهده همه گیم‌نت‌های {city} ←
          </Link>
        )}
      </footer>
    </section>
  );
}
