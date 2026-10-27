"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOwner } from "@/context/OwnerContext";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService, pickNumber } from "@/services/ownerService";
import type { MediaItem } from "@/types/owner";

const Icon = ({ d }: { d: string }) => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  edit: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-3-6.7M21 4v5h-5",
  megaphone: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M11 5.882a3 3 0 00-3-3H5a2 2 0 00-2 2v6a2 2 0 002 2h3a3 3 0 003-3",
  tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  support: "M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1v-4zm16 0h-3v5h2a1 1 0 001-1v-4zM17 19c0 1.5-2 2-5 2",
};

const TILES: { href: string; label: string; emoji: string; badge?: "pending" }[] = [
  { href: "/owner/reservations", label: "رزروها", emoji: "🎟️", badge: "pending" },
  { href: "/owner/withdraw", label: "برداشت موجودی", emoji: "💰" },
  { href: "/owner/stations", label: "دستگاه ها", emoji: "🎮" },
  { href: "/owner/reviews", label: "نظرات", emoji: "💬" },
];

const MENU = [
  { href: "/owner/edit", label: "ویرایش گیمنت", icon: ICONS.edit },
  { href: "/owner/hours", label: "ساعات کاری و تعطیلات", icon: ICONS.clock },
  { href: "/owner/ads", label: "ایجاد تبلیغات", icon: ICONS.megaphone, isRed: true },
  { href: "/owner/discounts", label: "ایجاد تخفیف", icon: ICONS.tag },
  { href: "/owner/support", label: "پشتیبانی", icon: ICONS.support },
];

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { centerId, center, ownerName } = useOwner();

  const [query, setQuery] = useState("");
  const [withdrawable, setWithdrawable] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [mediaToken, setMediaToken] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // درآمد + تعداد رزروهای در انتظار
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      ownerService.getAnalyticsSummary(centerId),
      ownerService.listReservations(centerId),
    ]).then(([summary, reservations]) => {
      if (!active) return;
      if (summary.status === "fulfilled") {
        setWithdrawable(
          pickNumber(summary.value, ["withdrawableAmount", "withdrawableRevenue", "netRevenue", "totalRevenue", "revenue"])
        );
      }
      if (reservations.status === "fulfilled") {
        setPendingCount(reservations.value.filter((r) => r.status === "PENDING").length);
      }
    });
    return () => {
      active = false;
    };
  }, [centerId]);

  // گالری
  useEffect(() => {
    if (!center?.slug) return;
    let active = true;
    ownerService
      .listMedia(center.slug)
      .then((items) => active && setMedia(items))
      .catch(() => active && setMedia([]));
    return () => {
      active = false;
    };
  }, [center?.slug, mediaToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/owner/reservations?q=${encodeURIComponent(q)}` : "/owner/reservations");
  };

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || uploading) return;
      setUploading(true);
      setGalleryError(null);
      try {
        await ownerService.uploadGalleryImage(centerId, file);
        setMediaToken((v) => v + 1);
      } catch (err) {
        setGalleryError(getErrorMessage(err));
      } finally {
        setUploading(false);
      }
    },
    [centerId, uploading]
  );

  // تعداد کاشی‌های «+» تا ردیف ۴تایی کامل شود (حداقل یک کاشی)
  const addTiles = Math.max(1, Math.ceil((media.length + 1) / 4) * 4 - media.length);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <main className="flex-1 px-4 pt-5 flex flex-col gap-5 lg:max-w-[880px] lg:mx-auto lg:w-full lg:px-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-base font-extrabold truncate">{ownerName}</h1>
            <Link href="/owner/edit" className="text-[11px] text-[var(--primary)] hover:underline">
              ویرایش
            </Link>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی کد رزرو مشتری"
            className="w-full h-12 rounded-card bg-[var(--foreground)]/60 px-4 pl-11 text-sm text-[var(--text-white)] placeholder:text-[var(--text-muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <button type="submit" aria-label="جستجو" className="absolute left-3 top-3 text-[var(--text-muted)]">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </form>

        {/* Earnings card */}
        <Link
          href="/owner/withdraw"
          className="relative overflow-hidden rounded-card bg-[var(--primary)] text-[#101014] p-4 min-h-[178px] flex flex-col justify-between"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background:
                "radial-gradient(circle at 50% 100%, transparent 0 22%, rgba(255,255,255,.55) 22% 23%, transparent 23% 38%, rgba(255,255,255,.4) 38% 39%, transparent 39% 56%, rgba(255,255,255,.3) 56% 57%, transparent 57%)",
            }}
          />
          <div className="relative flex items-center justify-between">
            <img src="/design/sayra.svg" alt="سایرا" className="h-7 w-auto brightness-0" />
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
              <path d="M8.5 12l2.5 2.5 4.5-5" />
            </svg>
          </div>

          <div className="relative flex flex-col gap-1">
            <span className="text-[11px] opacity-80">درآمد قابل برداشت</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black">
                {withdrawable === null ? "—" : formatPrice(withdrawable)}
              </span>
              <span className="text-lg font-black">تومان</span>
            </div>
            <span className="text-[11px] opacity-80 mt-1">
              {ownerName} / {center?.name ?? "گیمنت"}
            </span>
          </div>
        </Link>

        {/* Quick tiles */}
        <div className="grid grid-cols-4 gap-3">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="flex flex-col items-center gap-2">
              <span className="relative w-full aspect-square rounded-card bg-[var(--foreground)]/70 flex items-center justify-center text-4xl">
                {t.emoji}
                {t.badge === "pending" && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full bg-[var(--primary)] text-[#101014] text-xs font-black flex items-center justify-center">
                    {toPersianDigits(pendingCount)}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[var(--text-white)] text-center leading-tight">{t.label}</span>
            </Link>
          ))}
        </div>

        {/* Menu */}
        <div className="rounded-card bg-[var(--bg-card)] overflow-hidden divide-y divide-[var(--border-subtle)]">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className="flex items-center gap-3 px-5 h-16 hover:bg-[var(--foreground)]/20 transition-colors">
              <span className={m.isRed ? "text-[var(--accent-red)]" : "text-[var(--text-white)]"}>
                <Icon d={m.icon} />
              </span>
              <span className={`text-sm font-bold ${m.isRed ? "text-[var(--accent-red)]" : "text-[var(--text-white)]"}`}>{m.label}</span>
            </Link>
          ))}
        </div>

        {/* Gallery */}
        <section className="flex flex-col gap-3 mt-3">
          <h2 className="text-xs text-[var(--text-white)]">گالری تصاویر شما</h2>

          {galleryError && (
            <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
              {galleryError}
            </div>
          )}

          <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
            {media.map((m, i) => (
              <div key={m.id ?? `${m.url}-${i}`} className="relative aspect-square rounded-card overflow-hidden bg-[var(--foreground)]">
                <img src={m.url} alt={m.altText ?? "تصویر گیمنت"} className="w-full h-full object-cover" />
              </div>
            ))}

            {Array.from({ length: addTiles }).map((_, i) => (
              <button
                key={`add-${i}`}
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                aria-label="افزودن تصویر"
                className="aspect-square rounded-card bg-[var(--bg-card)] flex items-center justify-center disabled:opacity-50"
              >
                <span className="w-[70%] h-[70%] rounded-md border-2 border-dashed border-[var(--text-subtle)] flex items-center justify-center text-[var(--text-muted)] text-3xl">
                  {uploading && i === 0 ? (
                    <span className="w-5 h-5 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                  ) : (
                    "+"
                  )}
                </span>
              </button>
            ))}
          </div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </section>
      </main>

    </div>
  );
}