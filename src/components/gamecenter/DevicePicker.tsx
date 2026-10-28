"use client";

import React, { useCallback, useState } from "react";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { ExtraControllerModal } from "@/components/ExtraControllerModal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { CartEntry, DeviceGroup } from "@/lib/devices";

interface DevicePickerProps {
  groups: DeviceGroup[];
  cart: Record<string, CartEntry>;
  onQtyChange: (key: string, qty: number) => void;
  onExtraChange: (key: string, extra: number) => void;
}

const Stepper: React.FC<{
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}> = ({ value, min, max, onChange, label }) => (
  <div
    role="group"
    aria-label={label}
    className="flex items-center justify-between rounded-card bg-[var(--foreground)]/50 border border-[var(--border-color)] p-1"
  >
    <button
      type="button"
      onClick={() => onChange(value - 1)}
      disabled={value <= min}
      aria-label="کم کردن"
      className="w-10 h-10 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] text-lg font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 transition"
    >
      −
    </button>
    <span className="text-sm font-bold text-[var(--primary)]" aria-live="polite">
      {toPersianDigits(value)}
    </span>
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      disabled={value >= max}
      aria-label="اضافه کردن"
      className="w-10 h-10 rounded-lg bg-[var(--bg-card)] text-[var(--text-white)] text-lg font-bold flex items-center justify-center disabled:opacity-30 active:scale-95 transition"
    >
      +
    </button>
  </div>
);

export const DevicePicker: React.FC<DevicePickerProps> = ({ groups, cart, onQtyChange, onExtraChange }) => {
  const [activeConsoleModal, setActiveConsoleModal] = useState<DeviceGroup | null>(null);
  const [api, setApi] = useState<CarouselApi>();

  const handleAddClick = (g: DeviceGroup) => {
    onQtyChange(g.key, 1);
    if (g.isConsole) setActiveConsoleModal(g);
  };

  // جلوگیری از کلیک ناخواسته بعد از درگ (همان الگوی DiscountedCentersSection)
  const handleClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const embla = api as unknown as { clickAllowed?: () => boolean } | undefined;
      if (embla?.clickAllowed && !embla.clickAllowed()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [api]
  );

  if (groups.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-muted)]">
        فعلاً دستگاهی برای رزرو آنلاین ثبت نشده است.
      </div>
    );
  }

  const showArrows = groups.length > 1;
  const arrowCls =
    "hidden lg:flex w-9 h-9 bg-[var(--bg-body)]/80 backdrop-blur disabled:opacity-0";

  return (
    <>
      <Carousel
        setApi={setApi}
        opts={{
          direction: "rtl",
          align: "start",
          containScroll: "trimSnaps",
          slidesToScroll: "auto",
          dragFree: false,
          duration: 28,
        }}
        className="w-full group/devices"
      >
        <div onClickCapture={handleClickCapture} className="select-none py-1">
          <CarouselContent className="-mr-3">
            {groups.map((g) => {
              const entry = cart[g.key];
              const qty = entry?.qty ?? 0;
              const extra = entry?.extra ?? 0;
              const selected = qty > 0;
              const samePrice = g.minPrice === g.maxPrice;
              const canExtra = g.isConsole && typeof g.extraControllerPrice === "number";

              return (
                <CarouselItem
                  key={g.key}
                  className="pr-3 basis-[196px] sm:basis-[212px] min-w-0 flex"
                >
                  <article
                    className={`w-full rounded-card p-3 flex flex-col gap-3 border-2 transition-colors ${
                      selected
                        ? "bg-[var(--primary)]/[0.06] border-[var(--primary)]"
                        : "bg-[var(--bg-card)] border-[var(--border-subtle)]"
                    }`}
                  >
                    {/* تصویر */}
                    <div className="relative h-30 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] flex items-center justify-center p-3 overflow-hidden">
                      <img
                        src={g.image}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="w-full h-full object-cover drop-shadow-xl"
                      />
                      {selected && (
                        <span className="absolute top-2 left-2 min-w-6 h-6 px-1.5 rounded-full bg-[var(--primary)] text-on-primary text-xs font-bold flex items-center justify-center pt-0.5">
                          {toPersianDigits(qty)}
                        </span>
                      )}
                    </div>

                    {/* اطلاعات */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <h3 className="text-sm font-bold text-[var(--text-white)] truncate">{g.label}</h3>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        {!samePrice && <span className="text-xs text-[var(--text-muted)]">از</span>}
                        <span className="text-sm font-bold text-[var(--primary)]">{formatPrice(g.minPrice)}</span>
                        <span className="text-xs text-[var(--text-muted)]">تومان / ساعت</span>
                      </div>
                      <span className="text-xs text-[var(--text-subtle)]">
                        {toPersianDigits(g.capacity)} دستگاه موجود
                      </span>
                    </div>

                    {/* دستهٔ اضافه (فقط کنسول‌ها) */}
                    {selected && g.isConsole && (
                      <div className="rounded-card bg-[var(--bg-body)]/50 border border-[var(--border-subtle)] p-2.5 flex flex-col gap-1.5">
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          هر دستگاه با{" "}
                          <strong className="text-[var(--text-white)]">
                            {toPersianDigits(g.defaultControllers)} دسته
                          </strong>
                        </p>
                        {canExtra && (
                          <button
                            type="button"
                            onClick={() => setActiveConsoleModal(g)}
                            className="h-8 rounded-lg bg-[var(--foreground)] hover:bg-[var(--primary)] hover:text-on-primary text-xs font-bold text-[var(--text-white)] transition-colors"
                          >
                            {extra > 0 ? `${toPersianDigits(extra)} دسته اضافه • تغییر` : "+ دسته اضافه"}
                          </button>
                        )}
                        {canExtra && extra > 0 && g.extraControllerPrice ? (
                          <span className="text-xs text-center font-bold text-[var(--primary)]">
                            +{formatPrice(qty * extra * g.extraControllerPrice)} تومان / ساعت
                          </span>
                        ) : null}
                      </div>
                    )}

                    {/* اکشن؛ همیشه پایین کارت */}
                    <div className="mt-auto">
                      {!selected ? (
                        <button
                          type="button"
                          onClick={() => handleAddClick(g)}
                          className="h-11 w-full rounded-card bg-[var(--foreground)] hover:bg-[var(--primary)] hover:text-on-primary text-[var(--text-white)] text-sm font-bold transition-colors active:scale-[0.98]"
                        >
                          + افزودن
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <Stepper
                            value={qty}
                            min={0}
                            max={g.capacity}
                            onChange={(v) => onQtyChange(g.key, v)}
                            label={`تعداد ${g.label}`}
                          />

                        </div>
                      )}
                    </div>
                  </article>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </div>

        {/* فلش‌ها فقط در دسکتاپ و روی کناره‌ها */}
        {showArrows && (
          <>
            <CarouselPrevious className={arrowCls} />
            <CarouselNext className={arrowCls} />
          </>
        )}
      </Carousel>

      {activeConsoleModal && (
        <ExtraControllerModal
          isOpen={!!activeConsoleModal}
          onClose={() => setActiveConsoleModal(null)}
          onConfirm={(extraCount) => {
            onExtraChange(activeConsoleModal.key, extraCount);
            setActiveConsoleModal(null);
          }}
          deviceName={activeConsoleModal.label}
          defaultControllers={activeConsoleModal.defaultControllers}
          initialCount={cart[activeConsoleModal.key]?.extra ?? 0}
          maxExtra={activeConsoleModal.maxExtra}
          pricePerController={activeConsoleModal.extraControllerPrice ?? 0}
        />
      )}
    </>
  );
};