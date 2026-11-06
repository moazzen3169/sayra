"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Option, SearchableSelect } from "@/components/ui/SearchableSelect";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage, stationImageFor } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { catalogService } from "@/services/catalogService";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type { StationInput } from "@/types/owner";
import type { DeviceCatalogItem } from "@/types/catalog";

const POPULAR_GAMES = [
  "EA Sports FC 25",
  "Call of Duty: Modern Warfare III",
  "GTA V",
  "Mortal Kombat 1",
  "Tekken 8",
  "Counter-Strike 2",
  "Dota 2",
  "Elden Ring",
  "Apex Legends",
  "Rocket League",
  "God of War Ragnarök",
  "Spider-Man 2",
  "Forza Horizon 5",
  "Valorant",
];

const STATION_OPTIONS: Option[] = [
  { value: "PC", label: "PC (کامپیوتر گیمینگ)" },
  { value: "PLAYSTATION", label: "PLAYSTATION (پلی‌استیشن)" },
  { value: "XBOX", label: "XBOX (ایکس‌باکس)" },
  { value: "SWITCH", label: "SWITCH (نینتندو سوییچ)" },
  { value: "VR", label: "VR (واقعیت مجازی)" },
];

const input =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]";

export default function OwnerStationsPage() {
  const { centerId, verificationStatus } = useOwner();
  const isApproved = verificationStatus === "APPROVED";

  const [stations, setStations] = useState<GameStationInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Tab: "catalog" or "custom"
  const [addMode, setAddMode] = useState<"catalog" | "custom">("catalog");
  const [catalogDevices, setCatalogDevices] = useState<DeviceCatalogItem[]>([]);
  const [selectedCatalogDeviceId, setSelectedCatalogDeviceId] = useState<string>("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [type, setType] = useState<StationInput["stationType"]>("PC");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customPrefix, setCustomPrefix] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [defaultControllers, setDefaultControllers] = useState("2");
  const [maxExtraControllers, setMaxExtraControllers] = useState("2");
  const [extraControllerPrice, setExtraControllerPrice] = useState("50000");
  const [description, setDescription] = useState("");

  // مدیریت لیست تمامی بازی‌ها
  const [games, setGames] = useState<string[]>([
    "EA Sports FC 25",
    "Call of Duty: Modern Warfare III",
    "GTA V",
    "Mortal Kombat 1",
  ]);
  const [newGameInput, setNewGameInput] = useState("");
  const [gamesMsg, setGamesMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!centerId) {
      setStations([]);
      return;
    }
    let active = true;
    setStations(null);
    setError(null);
    const c = new AbortController();
    ownerService
      .listStations(centerId, c.signal)
      .then((d) => {
        if (!active) return;
        setStations(Array.isArray(d) ? d : []);
        setError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setStations([]);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [centerId, reload]);

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const addGame = (gameName: string) => {
    const trimmed = gameName.trim();
    if (!trimmed) return;
    if (!games.includes(trimmed)) {
      setGames((prev) => [...prev, trimmed]);
      setGamesMsg({ ok: true, text: `بازی «${trimmed}» به لیست اضافه شد.` });
    }
    setNewGameInput("");
  };

  const removeGame = (gameName: string) => {
    setGames((prev) => prev.filter((g) => g !== gameName));
    setGamesMsg({ ok: true, text: `بازی «${gameName}» از لیست حذف شد.` });
  };

  const togglePopularGame = (gameName: string) => {
    if (games.includes(gameName)) {
      removeGame(gameName);
    } else {
      addGame(gameName);
    }
  };

  useEffect(() => {
    if (open) {
      setCatalogLoading(true);
      catalogService
        .listDevices({ limit: 100 })
        .then((items) => {
          setCatalogDevices(items);
          if (items.length > 0 && !selectedCatalogDeviceId) {
            setSelectedCatalogDeviceId(items[0].id);
          }
        })
        .catch(() => {
          setCatalogDevices([]);
        })
        .finally(() => {
          setCatalogLoading(false);
        });
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const hourlyPrice = Number(price);
    if (!isFinite(hourlyPrice) || hourlyPrice <= 0) {
      setFormError("قیمت ساعتی معتبر را وارد کنید.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (addMode === "catalog") {
        if (!selectedCatalogDeviceId) {
          setFormError("دستگاه مورد نظر را از کاتالوگ انتخاب کنید.");
          setSaving(false);
          return;
        }
        await ownerService.createStationsFromCatalog(centerId, {
          catalogDeviceId: selectedCatalogDeviceId,
          quantity: Math.max(1, num(quantity) ?? 1),
          hourlyPrice,
          customNamePrefix: customPrefix.trim() || undefined,
          isVip,
        });
      } else {
        const selectedLabel = STATION_OPTIONS.find((o) => o.value === type)?.label.split(" ")[0] || type;
        const count = (stations?.length || 0) + 1;
        const autoName = customPrefix.trim() || `${selectedLabel} #${toPersianDigits(count)}`;

        await ownerService.createStation(centerId, {
          name: autoName,
          stationType: type,
          hourlyPrice,
          isVip,
          quantity: num(quantity) ?? 1,
          defaultControllers: num(defaultControllers) ?? 0,
          maxExtraControllers: num(maxExtraControllers) ?? 0,
          extraControllerPrice: num(extraControllerPrice) ?? 0,
          description: description.trim() || undefined,
        });
      }

      setOpen(false);
      setType("PC");
      setPrice("");
      setQuantity("1");
      setCustomPrefix("");
      setIsVip(false);
      setDefaultControllers("2");
      setMaxExtraControllers("2");
      setExtraControllerPrice("50000");
      setDescription("");
      setReload((v) => v + 1);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="دستگاه‌ها و بازی‌ها" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-6">

        {/* ۱. بخش دستگاه‌های گیم‌نت */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-white)]">دستگاه‌های گیم‌نت</h2>
            <button
              type="button"
              disabled={!isApproved}
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-card bg-[var(--primary)] text-on-primary font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow cursor-pointer"
            >
              + افزودن دستگاه
            </button>
          </div>

          {stations === null && <div className="h-24 rounded-card bg-[var(--bg-card)] animate-pulse" />}
          {error && <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>}
          {stations && !error && stations.length === 0 && (
            <div className="p-8 text-center rounded-card bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
              هنوز دستگاهی ثبت نشده است. برای تعریف کنسول‌ها یا کامپیوترها روی دکمه افزودن کلیک کنید.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {stations?.map((s) => (
              <div key={s.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 flex items-center gap-3">
                <div className="w-14 h-14 shrink-0 rounded-card bg-[var(--text-white)] flex items-center justify-center">
                  <img src={stationImageFor(s.stationType)} alt={s.name} className="w-12 h-12 object-contain" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate">{s.name}</span>
                    {s.isVip && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--primary)] text-on-primary">VIP</span>}
                    {s.isActive === false && <span className="text-xs font-bold text-[var(--accent-red)]">غیرفعال</span>}
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    {s.stationType}
                    {s.quantity ? ` • موجودی: ${toPersianDigits(s.quantity)} دستگاه` : ""}
                    {s.defaultControllers !== undefined && s.defaultControllers > 0 ? ` • ${toPersianDigits(s.defaultControllers)} دسته اصلی` : ""}
                    {s.maxExtraControllers !== undefined && s.maxExtraControllers > 0 ? ` • حداکثر ${toPersianDigits(s.maxExtraControllers)} دسته اضافه` : ""}
                  </span>
                </div>
                <div className="text-left shrink-0 flex flex-col items-end">
                  <div className="text-sm font-black text-[var(--primary)]">{formatPrice(s.hourlyPrice)}</div>
                  <div className="text-xs text-[var(--text-muted)]">تومان / ساعت</div>
                  {s.extraControllerPrice ? (
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      دسته اضافه: {formatPrice(s.extraControllerPrice)} ت
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ۲. بخش مدیریت لیست تمامی بازی‌ها */}
        <section className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-white)]">لیست تمامی بازی‌های گیمنت</h2>
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">
                بازی‌های موجود در این گیم‌نت را مدیریت کنید تا مشتریان در صفحه مجموعه مشاهده کنند.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
              {toPersianDigits(games.length)} بازی فعال
            </span>
          </div>

          {gamesMsg && (
            <div
              className={`p-3 rounded-card text-xs font-bold ${
                gamesMsg.ok
                  ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                  : "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
              }`}
            >
              {gamesMsg.text}
            </div>
          )}

          {/* تگ‌های بازی‌های انتخاب‌شده */}
          <div className="flex flex-wrap gap-2 min-h-[46px] p-3 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] items-center">
            {games.length === 0 ? (
              <span className="text-xs text-[var(--text-subtle)]">هیچ بازی برای این مرکز اضافه نشده است.</span>
            ) : (
              games.map((game) => (
                <span
                  key={game}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold animate-fadeIn"
                >
                  {game}
                  <button
                    type="button"
                    onClick={() => removeGame(game)}
                    className="hover:text-white transition-colors cursor-pointer text-sm font-black"
                    aria-label={`حذف ${game}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {/* ورودی افزودن بازی جدید */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="نام بازی جدید را بنویسید (مثلاً Tekken 8)..."
              value={newGameInput}
              onChange={(e) => setNewGameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGame(newGameInput);
                }
              }}
              className="flex-1 h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs text-[var(--text-white)] outline-none placeholder:text-[var(--text-subtle)]"
            />
            <button
              type="button"
              onClick={() => addGame(newGameInput)}
              className="h-11 px-5 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow"
            >
              افزودن بازی
            </button>
          </div>

          {/* انتخاب سریع از بازی‌های محبوب */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-muted)] font-bold">انتخاب سریع از بازی‌های پرطرفدار:</span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_GAMES.map((gameName) => {
                const selected = games.includes(gameName);
                return (
                  <button
                    key={gameName}
                    type="button"
                    onClick={() => togglePopularGame(gameName)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                      selected
                        ? "bg-[var(--primary)] text-black border-[var(--primary)] font-bold shadow-sm"
                        : "bg-[var(--foreground)]/30 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)] hover:border-[var(--border-color)]"
                    }`}
                  >
                    {selected ? `✓ ${gameName}` : `+ ${gameName}`}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* مودال افزودن دستگاه */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <form
            onSubmit={submit}
            className="w-full max-w-[460px] max-h-[92vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">افزودن دستگاه به گیم‌نت</h3>
              <div className="flex rounded-lg bg-[var(--foreground)]/40 p-1 border border-[var(--border-subtle)] text-xs">
                <button
                  type="button"
                  onClick={() => setAddMode("catalog")}
                  className={`px-3 py-1 rounded-md transition-all font-bold ${
                    addMode === "catalog"
                      ? "bg-[var(--primary)] text-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
                  }`}
                >
                  از کاتالوگ
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("custom")}
                  className={`px-3 py-1 rounded-md transition-all font-bold ${
                    addMode === "custom"
                      ? "bg-[var(--primary)] text-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
                  }`}
                >
                  سفارشی / دستی
                </button>
              </div>
            </div>

            {formError && <p className="text-xs font-bold text-[var(--accent-red)]">{formError}</p>}

            {addMode === "catalog" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">
                  انتخاب دستگاه از کاتالوگ مرکزی
                </label>
                {catalogLoading ? (
                  <div className="h-11 rounded-card bg-[var(--foreground)]/20 animate-pulse" />
                ) : catalogDevices.length === 0 ? (
                  <div className="p-3 text-xs text-[var(--text-muted)] bg-[var(--foreground)]/20 rounded-card">
                    دستگاهی در کاتالوگ یافت نشد، از تب «سفارشی / دستی» استفاده کنید.
                  </div>
                ) : (
                  <select
                    className={input}
                    value={selectedCatalogDeviceId}
                    onChange={(e) => setSelectedCatalogDeviceId(e.target.value)}
                  >
                    {catalogDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.deviceType})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">نوع پلتفرم دستگاه</label>
                <SearchableSelect
                  options={STATION_OPTIONS}
                  value={type}
                  onChange={(v) => setType(v as StationInput["stationType"])}
                  placeholder="انتخاب نوع دستگاه"
                  searchPlaceholder="جستجوی نوع دستگاه..."
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">
                نام یا پیشوند دستگاه (اختیاری)
              </label>
              <input
                className={input}
                type="text"
                placeholder={addMode === "catalog" ? "مثلاً PS5 VIP" : "مثلاً سیستم شماره ۱"}
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">قیمت دستگاه برای ۱ ساعت (تومان)</label>
              <input
                className={input}
                type="number"
                min={0}
                placeholder="مثلاً ۱۵۰,۰۰۰"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">تعداد موجود از این دستگاه</label>
              <input
                className={input}
                type="number"
                min={1}
                placeholder="مثلاً ۵"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="p-3.5 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col gap-3">
              <h4 className="text-xs font-bold text-[var(--text-white)]">تنظیمات دسته‌ها (کنترلرها)</h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[var(--text-muted)]">تعداد دسته‌های همراه</label>
                  <input
                    className={input}
                    type="number"
                    min={0}
                    placeholder="مثلاً ۲"
                    value={defaultControllers}
                    onChange={(e) => setDefaultControllers(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[var(--text-muted)]">حداکثر دسته‌های اضافی</label>
                  <input
                    className={input}
                    type="number"
                    min={0}
                    placeholder="مثلاً ۲"
                    value={maxExtraControllers}
                    onChange={(e) => setMaxExtraControllers(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[var(--text-muted)]">قیمت هر دسته اضافه برای ۱ ساعت (تومان)</label>
                <input
                  className={input}
                  type="number"
                  min={0}
                  placeholder="مثلاً ۵۰,۰۰۰"
                  value={extraControllerPrice}
                  onChange={(e) => setExtraControllerPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVipStation"
                checked={isVip}
                onChange={(e) => setIsVip(e.target.checked)}
                className="cursor-pointer"
              />
              <label htmlFor="isVipStation" className="text-xs font-bold text-[var(--text-white)] cursor-pointer">
                این دستگاه(ها) به عنوان VIP ثبت شوند
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">توضیحات دستگاه (اختیاری)</label>
              <textarea
                className="p-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)] resize-none"
                rows={3}
                placeholder="توضیحات تکمیلی درباره دستگاه، مشخصات یا تجهیزات..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-11 rounded-card bg-[var(--primary)] text-on-primary font-bold text-sm disabled:opacity-60 cursor-pointer"
              >
                {saving ? "در حال ثبت..." : "ثبت دستگاه"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
