"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GamecenterDetailHeader } from "@/components/GamecenterDetailHeader";
import { ExtraControllerModal } from "@/components/ExtraControllerModal";
import { generateTenDays, DateOption } from "@/lib/dates";
import { generateHourlySlots, TimeSlotOption } from "@/lib/slots";
import { formatPrice, toPersianDigits } from "@/lib/format";

interface DeviceOption {
  id: string;
  name: string;
  type: string;
  isConsole: boolean;
  pricePerHour: number;
  image: string;
  availableCount: number;
}

const devicesData: DeviceOption[] = [
  {
    id: "pc",
    name: "کامپیوتر گیمینگ",
    type: "Computer",
    isConsole: false,
    pricePerHour: 180000,
    image: "/img/pc.webp",
    availableCount: 12,
  },
  {
    id: "ps5",
    name: "پلی استیشن ۵",
    type: "PS5",
    isConsole: true,
    pricePerHour: 220000,
    image: "/img/PS5.webp",
    availableCount: 8,
  },
  {
    id: "ps4",
    name: "پلی استیشن ۴",
    type: "PS4",
    isConsole: true,
    pricePerHour: 140000,
    image: "/img/PS4.webp",
    availableCount: 6,
  },
  {
    id: "xbox",
    name: "ایکس باکس سری ایکس",
    type: "Xbox",
    isConsole: true,
    pricePerHour: 190000,
    image: "/img/xbox.webp",
    availableCount: 5,
  },
];

const reviewsData = [
  {
    id: "r1",
    author: "علی محمدی",
    rating: 5,
    date: "۲ روز پیش",
    comment: "سیستم‌های بسیار قوی و مانیتورهای ۲۴۰ هرتز عالی بودن. برخورد پرسنل هم بسیار محترمانه بود.",
  },
  {
    id: "r2",
    author: "رضا کریمی",
    rating: 4.5,
    date: "۱ هفته پیش",
    comment: "صندلی‌های گیمینگ فوق‌العاده راحت. فقط کمی جای پارک سخت پیدا شد ولی در کل پیشنهاد میشه.",
  },
];

const EXTRA_CONTROLLER_PRICE_PER_HOUR = 30000;

export default function GameCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: gameCenterId } = use(params);

  // States
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("ps5");
  const [quantity, setQuantity] = useState<number>(1);
  const [extraControllersCount, setExtraControllersCount] = useState<number>(0);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState<boolean>(false);

  // 10 days generated dynamically
  const [dateOptions] = useState<DateOption[]>(() => generateTenDays());
  const [selectedDateId, setSelectedDateId] = useState<string>("day-0");

  // Hourly slots (multi-select)
  const [timeSlots] = useState<TimeSlotOption[]>(() => generateHourlySlots());
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(["slot-14", "slot-15"]);

  // Scroll detection for sticky header title
  const [showStickyTitle, setShowStickyTitle] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 180) {
        setShowStickyTitle(true);
      } else {
        setShowStickyTitle(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const selectedDevice = devicesData.find((d) => d.id === selectedDeviceId) || devicesData[1];

  // Device selection handler
  const handleSelectDevice = (dev: DeviceOption) => {
    setSelectedDeviceId(dev.id);
    setQuantity(1);
    if (dev.isConsole) {
      setIsExtraModalOpen(true);
    } else {
      setExtraControllersCount(0);
    }
  };

  // Time slot toggle
  const handleToggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) => {
      if (prev.includes(slotId)) {
        // Keep at least 1 slot selected or allow empty
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== slotId);
      } else {
        return [...prev, slotId];
      }
    });
  };

  // Quantity handlers
  const handleIncrement = () => {
    if (quantity < selectedDevice.availableCount) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  // Calculate pricing
  const totalHours = selectedSlotIds.length;
  const basePricePerHour = selectedDevice.pricePerHour * quantity;
  const extraControllerPricePerHour = extraControllersCount * EXTRA_CONTROLLER_PRICE_PER_HOUR;
  const totalPricePerHour = basePricePerHour + extraControllerPricePerHour;
  const grandTotalPrice = totalPricePerHour * totalHours;

  const handleContinueReservation = () => {
    const dateObj = dateOptions.find((d) => d.id === selectedDateId);
    const selectedSlots = timeSlots.filter((s) => selectedSlotIds.includes(s.id));
    const hoursSummary = selectedSlots.map((s) => s.timeLabel).join("، ");

    alert(
      `رزرو گیمنت کد ${gameCenterId}\n` +
      `دستگاه: ${quantity} عدد ${selectedDevice.name}\n` +
      (extraControllersCount > 0 ? `دسته اضافه: ${toPersianDigits(extraControllersCount)} عدد\n` : "") +
      `تاریخ: ${dateObj?.dayName} (${dateObj?.dateStr})\n` +
      `ساعات انتخاب‌شده (${toPersianDigits(totalHours)} ساعت): ${hoursSummary}\n` +
      `مبلغ کل: ${formatPrice(grandTotalPrice)} تومان`
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28">
      {/* Dedicated Sticky Header */}
      <GamecenterDetailHeader
        title="گیمنت اختصاصی گرگدن"
        location="تبریز، ولیعصر، بعد از میدان معلم"
        showDetails={showStickyTitle}
        onBackClick={() => router.back()}
        onNotificationClick={() => alert("اعلانات سایرا")}
        unreadNotificationsCount={2}
      />

      <main className="flex-1 flex flex-col gap-5">
        {/* Cover Image */}
        <div className="relative w-full aspect-[16/9] bg-[var(--foreground)]">
          <Image
            src="/img/gamnet-1.webp"
            alt="گیمنت گرگدن"
            fill
            className="object-cover"
            priority
          />
          <span className="absolute top-3 left-3 px-3 pt-1 pb-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-xs font-black shadow-lg">
            ۲۵٪ تخفیف
          </span>
        </div>

        {/* Game Center Information */}
        <div className="px-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-[var(--text-white)]">
              گیمنت اختصاصی گرگدن
            </h1>
            <div className="flex items-center gap-1 text-xs text-[var(--primary)] font-bold">
              <span>★ {toPersianDigits("4.8")}</span>
              <span className="text-[var(--text-muted)] font-normal">(۷۴۴ دیدگاه)</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            تبریز، ولیعصر، بعد از میدان معلم، روبروی کتابخانه عمومی
          </p>


          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => alert("مسیریابی روی نقشه")}
              className="flex-1 h-10 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] flex items-center justify-center gap-2 hover:bg-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>مسیریابی و آدرس</span>
            </button>

            <button
              type="button"
              onClick={() => alert("لیست بازی‌های موجود")}
              className="flex-1 h-10 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-white)] flex items-center justify-center gap-2 hover:bg-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>لیست بازی‌ها</span>
            </button>
          </div>
        </div>

        {/* Section Divider */}
        <div className=" " />

        {/* Device Selection & Quantity */}
        <div className="px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-white)]">
              انتخاب دستگاه و تعداد
            </h2>

          </div>

          <div className="flex flex-col gap-3">
            {devicesData.map((dev) => {
              const isSelected = selectedDeviceId === dev.id;
              return (
                <div
                  key={dev.id}
                  onClick={() => handleSelectDevice(dev)}
                  className={`relative w-full rounded-card p-3 bg-[var(--bg-card)] border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-[var(--primary)] shadow-[0_0_15px_rgba(255,255,61,0.12)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[var(--text-white)]">
                        {dev.name}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-[10px] font-black">
                          انتخاب شده
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <span>قیمت هر ساعت:</span>
                      <span className="font-extrabold text-[var(--primary)]">
                        {formatPrice(dev.pricePerHour)}
                      </span>
                      <span>تومان</span>
                    </div>

                    {/* Console extra controller badge if selected */}
                    {isSelected && dev.isConsole && extraControllersCount > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--foreground)] text-[var(--primary)] text-[11px] font-bold border border-[var(--primary)]/30">
                          +{toPersianDigits(extraControllersCount)} دسته اضافه (+{formatPrice(extraControllersCount * EXTRA_CONTROLLER_PRICE_PER_HOUR)} ت/س)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsExtraModalOpen(true);
                          }}
                          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--primary)] underline font-bold"
                        >
                          تغییر
                        </button>
                      </div>
                    )}

                    {/* Quantity controls inside selected card */}
                    {isSelected && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]"
                      >
                        <span className="text-xs font-bold text-[var(--text-white)]">
                          تعداد دستگاه:
                        </span>
                        <div className="flex items-center gap-2 bg-[var(--foreground)]/60 rounded-card p-1 border border-[var(--border-color)]">
                          <button
                            type="button"
                            onClick={handleDecrement}
                            disabled={quantity <= 1}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] flex items-center justify-center font-black text-sm disabled:opacity-40 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black text-[var(--primary)]">
                            {toPersianDigits(quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={handleIncrement}
                            disabled={quantity >= dev.availableCount}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] flex items-center justify-center font-black text-sm disabled:opacity-40 hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Device Image */}
                  <div className="relative w-20 h-20 shrink-0 bg-[var(--foreground)]/40 rounded-card overflow-hidden p-1 flex items-center justify-center border border-[var(--border-subtle)]">
                    <Image
                      src={dev.image}
                      alt={dev.name}
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Divider */}
        <div className=" " />

        {/* Reservation Date Selection (10 Days) */}
        <div className="px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-white)]">
              تاریخ رزرو
            </h2>

          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {dateOptions.map((dateObj) => {
              const isSelected = selectedDateId === dateObj.id;
              return (
                <button
                  key={dateObj.id}
                  type="button"
                  onClick={() => setSelectedDateId(dateObj.id)}
                  className={`w-24 min-w-[96px] h-16 shrink-0 rounded-card flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--primary)] text-[#101014] border-[var(--primary)] font-black shadow-lg scale-[1.02]"
                      : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <span className="text-xs font-extrabold truncate w-full text-center px-1">
                    {dateObj.dayName}
                  </span>
                  <span className={`text-[11px] ${isSelected ? "text-[#101014]/80 font-bold" : "text-[var(--text-muted)]"}`}>
                    {dateObj.dateStr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reservation Time Slot Selection (1-Hour Multi-Select Slots, No Restrictions) */}
        <div className="px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-white)]">
              ساعات بازی (۱ ساعته)
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              امکان انتخاب چندین ساعت
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {timeSlots.map((slot) => {
              const isSelected = selectedSlotIds.includes(slot.id);
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleToggleSlot(slot.id)}
                  className={`h-12 rounded-card flex items-center justify-between px-3 text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--primary)] text-[#101014] border-[var(--primary)] font-black shadow-md"
                      : "bg-[var(--bg-card)] text-[var(--text-white)] border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                  }`}
                >
                  <span>{slot.timeLabel}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-[#101014] text-[var(--primary)] text-[10px] flex items-center justify-center font-black">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Divider */}
        <div className=" " />

        {/* User Reviews Section */}
        <div className="px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[var(--text-white)]">
              نظرات و امتیازات کاربران
            </h2>

          </div>

          <div className="flex flex-col gap-3">
            {reviewsData.map((rev) => (
              <div
                key={rev.id}
                className="w-full bg-[var(--bg-card)] rounded-card p-3.5 border border-[var(--border-subtle)] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--foreground)] text-[var(--primary)] font-black text-xs flex items-center justify-center">
                      {rev.author[0]}
                    </div>
                    <span className="text-xs font-bold text-[var(--text-white)]">
                      {rev.author}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[var(--primary)] font-bold">★ {toPersianDigits(rev.rating)}</span>
                    <span className="text-[var(--text-subtle)]">• {rev.date}</span>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Fixed Bottom Reservation Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div className="w-full max-w-[780px] bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-color)] px-4 py-3 flex items-center justify-between gap-4 pointer-events-auto shadow-2xl">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-muted)]">
              {toPersianDigits(quantity)} عدد {selectedDevice.name} • {toPersianDigits(totalHours)} ساعت
            </span>
            <div className="flex items-center gap-1">
              <span className="text-base font-black text-[var(--primary)]">
                {formatPrice(grandTotalPrice)}
              </span>
              <span className="text-xs text-[var(--text-white)]">تومان</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinueReservation}
            className="h-12 px-8 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
          >
            <span>ادامه و رزرو</span>
            <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Extra Controller Modal */}
      <ExtraControllerModal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        onConfirm={(count) => setExtraControllersCount(count)}
        deviceName={selectedDevice.name}
        initialCount={extraControllersCount}
        pricePerController={EXTRA_CONTROLLER_PRICE_PER_HOUR}
      />
    </div>
  );
}
