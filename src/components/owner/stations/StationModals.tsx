"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import {
  STATION_TYPE_OPTIONS,
  getStationPrice,
  parseAmount,
  stationTypeLabel,
} from "@/lib/ownerStations";
import { getErrorMessage } from "@/lib/reservationUi";
import type { GameStationInfo } from "@/services/gamingCenterService";
import { ownerService } from "@/services/ownerService";
import type { DeviceCatalogItem } from "@/types/catalog";
import type { StationInput } from "@/types/owner";

/* ---------- اجزای مشترک ---------- */

const FormError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
    >
      <Icon name="alert" size={16} className="mt-1" />
      <span>{message}</span>
    </div>
  ) : null;

const CheckField: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}> = ({ id, label, checked, disabled, onChange }) => (
  <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-[var(--text-white)]">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-5 w-5 cursor-pointer accent-[var(--primary)]"
    />
    <span>{label}</span>
  </label>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-xs font-bold text-[var(--text-muted)]">{children}</span>
);

const noop = () => {};

/* ---------- افزودن دستگاه ---------- */

type StationType = StationInput["stationType"];

interface AddStationModalProps {
  centerId: string;
  catalogDevices: DeviceCatalogItem[];
  catalogLoading: boolean;
  catalogError: string | null;
  onRetryCatalog: () => void;
  initialMode: "catalog" | "custom";
  initialCatalogId?: string;
  initialStationType?: string;
  onClose: () => void;
  /** بعد از ثبت کامل */
  onSaved: (message: string) => void;
  /** ثبت ناقص (چند دستگاه سفارشی)؛ فقط لیست را تازه می‌کند */
  onChanged: () => void;
}

export const AddStationModal: React.FC<AddStationModalProps> = ({
  centerId,
  catalogDevices,
  catalogLoading,
  catalogError,
  onRetryCatalog,
  initialMode,
  initialCatalogId,
  initialStationType,
  onClose,
  onSaved,
  onChanged,
}) => {
  const [mode, setMode] = useState<"catalog" | "custom">(initialMode);
  const [catalogId, setCatalogId] = useState(initialCatalogId ?? "");
  const [type, setType] = useState<string>(
    initialStationType && STATION_TYPE_OPTIONS.some((o) => o.value === initialStationType)
      ? initialStationType
      : "PC"
  );
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isVip, setIsVip] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    catalog?: string;
    name?: string;
    price?: string;
    quantity?: string;
  }>({});

  const effectiveCatalogId = catalogId || catalogDevices[0]?.id || "";
  const maxQuantity = mode === "catalog" ? 100 : 50;

  const catalogOptions = catalogDevices.map((d) => ({
    value: d.id,
    label: `${d.name} (${stationTypeLabel(String(d.deviceType ?? ""))})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const errors: typeof fieldErrors = {};
    const hourlyPrice = parseAmount(price, toEnglishDigits);
    const count = parseAmount(quantity, toEnglishDigits);
    const trimmedName = name.trim();

    if (mode === "catalog" && !effectiveCatalogId) {
      errors.catalog = "یک دستگاه از کاتالوگ انتخاب کنید.";
    }
    if (mode === "custom" && trimmedName.length < 2) {
      errors.name = "نام دستگاه را وارد کنید.";
    }
    if (hourlyPrice === null || hourlyPrice <= 0) {
      errors.price = "قیمت هر ساعت را به تومان و با عدد وارد کنید.";
    }
    if (count === null || !Number.isInteger(count) || count < 1 || count > maxQuantity) {
      errors.quantity = `تعداد را بین ۱ تا ${toPersianDigits(maxQuantity)} وارد کنید.`;
    }

    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0 || hourlyPrice === null || count === null) return;

    setSaving(true);
    try {
      if (mode === "catalog") {
        const created = await ownerService.createStationsFromCatalog(centerId, {
          catalogDeviceId: effectiveCatalogId,
          quantity: count,
          hourlyPrice,
          customNamePrefix: trimmedName || undefined,
          isVip,
        });
        const n = created.length > 0 ? created.length : count;
        onSaved(`${toPersianDigits(n)} دستگاه به گیمنت اضافه شد.`);
        return;
      }

      // حالت سفارشی: قرارداد API هر درخواست را برای یک دستگاه می‌پذیرد
      let ok = 0;
      let lastError: unknown = null;
      for (let i = 1; i <= count; i++) {
        try {
          await ownerService.createStation(centerId, {
            name: count > 1 ? `${trimmedName} ${toPersianDigits(i)}` : trimmedName,
            stationType: type as StationType,
            hourlyPrice,
            isVip,
          });
          ok += 1;
        } catch (err) {
          lastError = err;
          break;
        }
      }

      if (ok === count) {
        onSaved(`${toPersianDigits(ok)} دستگاه به گیمنت اضافه شد.`);
      } else if (ok > 0) {
        onChanged();
        const remaining = count - ok;
        setQuantity(String(remaining));
        setError(
          `${toPersianDigits(ok)} دستگاه ثبت شد، اما ثبت بقیه انجام نشد. ${getErrorMessage(lastError)} تعداد باقی‌مانده را دوباره ثبت کنید.`
        );
      } else {
        setError(getErrorMessage(lastError));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={saving ? noop : onClose} title="افزودن دستگاه">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div role="group" aria-label="روش افزودن" className="grid grid-cols-2 gap-1 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/30 p-1">
          {(
            [
              ["catalog", "از کاتالوگ"],
              ["custom", "سفارشی"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              disabled={saving}
              className={`h-10 rounded-card text-xs font-bold transition-colors ${
                mode === value
                  ? "bg-[var(--primary)] text-on-primary"
                  : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "catalog" ? (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>دستگاه کاتالوگ</FieldLabel>
            {catalogLoading ? (
              <div className="h-11 animate-pulse rounded-card bg-[var(--foreground)]/40" aria-busy="true" />
            ) : catalogError ? (
              <div className="flex items-center justify-between gap-3 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold text-[var(--accent-red)]">
                <span>کاتالوگ بارگذاری نشد.</span>
                <button type="button" onClick={onRetryCatalog} className="h-11 px-2 text-[var(--text-white)] underline">
                  تلاش دوباره
                </button>
              </div>
            ) : catalogOptions.length === 0 ? (
              <p className="rounded-card border border-dashed border-[var(--border-color)] p-3 text-xs text-[var(--text-muted)]">
                در کاتالوگ دستگاهی نیست. از حالت سفارشی استفاده کنید.
              </p>
            ) : (
              <SearchableSelect
                options={catalogOptions}
                value={effectiveCatalogId}
                onChange={setCatalogId}
                placeholder="انتخاب دستگاه"
                searchPlaceholder="جستجوی دستگاه…"
              />
            )}
            {fieldErrors.catalog && (
              <span className="text-xs font-medium text-[var(--accent-red)]">{fieldErrors.catalog}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>نوع دستگاه</FieldLabel>
            <SearchableSelect
              options={STATION_TYPE_OPTIONS}
              value={type}
              onChange={setType}
              placeholder="انتخاب نوع دستگاه"
              searchPlaceholder="جستجوی نوع…"
            />
          </div>
        )}

        <Input
          label={mode === "custom" ? "نام دستگاه" : "پیشوند نام (اختیاری)"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode === "custom" ? "مثلاً سیستم VIP" : "مثلاً PS5 VIP"}
          helperText={
            mode === "custom"
              ? "اگر بیش از یک دستگاه ثبت کنید، شماره به انتهای نام اضافه می‌شود."
              : undefined
          }
          error={fieldErrors.name}
          disabled={saving}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="قیمت هر ساعت (تومان)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="۱۵۰۰۰۰"
            error={fieldErrors.price}
            disabled={saving}
          />
          <Input
            label="تعداد دستگاه"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputMode="numeric"
            error={fieldErrors.quantity}
            disabled={saving}
          />
        </div>

        <CheckField id="add-station-vip" label="این دستگاه‌ها VIP هستند" checked={isVip} onChange={setIsVip} disabled={saving} />

        <FormError message={error} />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg" isLoading={saving} className="sm:flex-1">
            ثبت دستگاه
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={saving}>
            انصراف
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ---------- ویرایش دستگاه ---------- */

interface EditStationModalProps {
  centerId: string;
  station: GameStationInfo;
  onClose: () => void;
  onSaved: (message: string, updatedStation?: GameStationInfo) => void;
}

export const EditStationModal: React.FC<EditStationModalProps> = ({
  centerId,
  station,
  onClose,
  onSaved,
}) => {
  const currentPrice = getStationPrice(station);
  const [name, setName] = useState(station.name ?? "");
  const [price, setPrice] = useState(currentPrice !== null ? String(currentPrice) : "");
  const [isVip, setIsVip] = useState(Boolean(station.isVip));
  const [active, setActive] = useState(station.isActive !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; price?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const errors: typeof fieldErrors = {};
    const hourlyPrice = parseAmount(price, toEnglishDigits);
    const trimmed = name.trim();

    if (trimmed.length < 2) errors.name = "نام دستگاه را وارد کنید.";
    if (hourlyPrice === null || hourlyPrice <= 0) {
      errors.price = "قیمت هر ساعت را به تومان و با عدد وارد کنید.";
    }
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0 || hourlyPrice === null) return;

    setSaving(true);
    try {
      // ارسال همزمان فیلدهای متداول برای سازگاری کامل با بک‌اند
      const res = await ownerService.updateStation(centerId, station.id, {
        name: trimmed,
        hourlyPrice,
        hourlyRate: hourlyPrice,
        isVip,
        stationType: station.stationType,
        isActive: active,
      });

      const updatedStation: GameStationInfo = {
        ...station,
        ...(res || {}),
        name: trimmed,
        hourlyPrice,
        isVip,
        isActive: active,
      };

      onSaved(`تغییرات «${trimmed}» با موفقیت ثبت و اعمال شد.`, updatedStation);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={saving ? noop : onClose} title="ویرایش دستگاه">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-xs text-[var(--text-muted)]">
          نوع دستگاه: <span className="font-bold text-[var(--text-white)]">{stationTypeLabel(station.stationType)}</span>
        </p>

        <Input
          label="نام دستگاه"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          disabled={saving}
        />
        <Input
          label="قیمت هر ساعت (تومان)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="numeric"
          error={fieldErrors.price}
          disabled={saving}
        />

        <CheckField
          id="edit-station-vip"
          label="این دستگاه VIP است"
          checked={isVip}
          onChange={setIsVip}
          disabled={saving}
        />

        <CheckField
          id="edit-station-active"
          label="دستگاه فعال و قابل رزرو است"
          checked={active}
          onChange={setActive}
          disabled={saving}
        />

        <FormError message={error} />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button type="submit" size="lg" isLoading={saving} className="sm:flex-1">
            ذخیره تغییرات
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={saving}>
            انصراف
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* ---------- حذف دستگاه ---------- */

interface DeleteStationModalProps {
  centerId: string;
  station: GameStationInfo;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const DeleteStationModal: React.FC<DeleteStationModalProps> = ({
  centerId,
  station,
  onClose,
  onSaved,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await ownerService.deleteStation(centerId, station.id);
      onSaved(`دستگاه «${station.name}» حذف شد.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen onClose={deleting ? noop : onClose} title="حذف دستگاه">
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-7 text-[var(--text-white)]">
          «{station.name}» از فهرست گیمنت حذف می‌شود و مشتریان دیگر نمی‌توانند آن را رزرو کنند.
        </p>

        <FormError message={error} />

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            type="button"
            size="lg"
            isLoading={deleting}
            onClick={handleDelete}
            className="border-transparent bg-[var(--accent-red)] text-white hover:bg-[var(--accent-red)]/90 sm:flex-1"
          >
            حذف دستگاه
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={deleting}>
            انصراف
          </Button>
        </div>
      </div>
    </Modal>
  );
};