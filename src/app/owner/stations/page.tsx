"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Option, SearchableSelect } from "@/components/ui/SearchableSelect";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage, stationImageFor } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type { StationInput } from "@/types/owner";

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

  const [type, setType] = useState<StationInput["stationType"]>("PC");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let active = true;
    const c = new AbortController();
    ownerService
      .listStations(centerId, c.signal)
      .then((d) => {
        if (!active) return;
        setStations(d);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const hourlyPrice = Number(price);
    if (!type || !isFinite(hourlyPrice) || hourlyPrice <= 0) {
      setFormError("نوع دستگاه و قیمت ساعتی معتبر را وارد کنید.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const selectedLabel = STATION_OPTIONS.find((o) => o.value === type)?.label.split(" ")[0] || type;
    const count = (stations?.length || 0) + 1;
    const autoName = `${selectedLabel} #${toPersianDigits(count)}`;

    try {
      await ownerService.createStation(centerId, {
        name: autoName,
        stationType: type,
        hourlyPrice,
        description: description.trim() || undefined,
      });
      setOpen(false);
      setType("PC");
      setPrice("");
      setDescription("");
      setReload((v) => v + 1);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="دستگاه ها" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[880px] lg:mx-auto lg:w-full lg:px-0 flex flex-col gap-3">
        <button
          type="button"
          disabled={!isApproved}
          onClick={() => setOpen(true)}
          className="h-12 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + افزودن دستگاه
        </button>

        {stations === null && <div className="h-24 rounded-card bg-[var(--bg-card)] animate-pulse" />}
        {error && <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>}
        {stations && !error && stations.length === 0 && (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">هنوز دستگاهی ثبت نشده است.</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {stations?.map((s) => (
            <div key={s.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 flex items-center gap-3">
              <div className="w-14 h-14 shrink-0 rounded-card bg-[var(--text-white)] flex items-center justify-center">
                <img src={stationImageFor(s.stationType)} alt={s.name} className="w-12 h-12 object-contain" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold truncate">{s.name}</span>
                  {s.isVip && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--primary)] text-[#101014]">VIP</span>}
                  {s.isActive === false && <span className="text-[10px] font-bold text-[var(--accent-red)]">غیرفعال</span>}
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {s.stationType}
                  {s.minRentHours ? ` • حداقل ${toPersianDigits(s.minRentHours)} ساعت` : ""}
                  {s.maxRentHours ? ` • حداکثر ${toPersianDigits(s.maxRentHours)} ساعت` : ""}
                </span>
              </div>
              <div className="text-left shrink-0">
                <div className="text-sm font-black text-[var(--primary)]">{formatPrice(s.hourlyPrice)}</div>
                <div className="text-[10px] text-[var(--text-muted)]">تومان / ساعت</div>
              </div>
            </div>
          ))}
        </div>
      </main>

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
            <h3 className="text-base font-black">افزودن دستگاه</h3>
            {formError && <p className="text-xs font-bold text-[var(--accent-red)]">{formError}</p>}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نوع دستگاه</label>
              <SearchableSelect
                options={STATION_OPTIONS}
                value={type}
                onChange={(v) => setType(v as StationInput["stationType"])}
                placeholder="انتخاب نوع دستگاه"
                searchPlaceholder="جستجوی نوع دستگاه..."
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
                className="flex-1 h-11 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm disabled:opacity-60"
              >
                {saving ? "در حال ثبت..." : "ثبت دستگاه"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold"
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