"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { OwnerToggleSwitch } from "@/components/owner/OwnerToggleSwitch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { SafeImage } from "@/components/ui/SafeImage";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Skeleton } from "@/components/ui/Skeleton";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatToman, toEnglishDigits, toPersianDigits, tomanToRial } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/media";
import {
  parseAmount,
  stationTypeLabel,
} from "@/lib/ownerStations";
import { getErrorMessage, stationImageFor } from "@/lib/reservationUi";
import { catalogService } from "@/services/catalogService";
import { ownerService } from "@/services/ownerService";
import {
  createEmptyExtraControllerRow,
  validateExtraControllerRows,
  type ExtraControllerDraftRow,
} from "@/components/owner/stations/ExtraControllersEditor";
import type { DeviceCatalogItem, DynamicDeviceType } from "@/types/catalog";

function inferControllerTypeForDevice(device: DeviceCatalogItem | null): string {
  if (!device) return "دسته اضافی";
  const text = `${device.name ?? ""} ${device.deviceType ?? ""}`;
  if (/ps\s*5|playstation\s*5|پلی\s*استیشن\s*[5۵]/i.test(text)) return "دسته PS5";
  if (/ps\s*4|playstation\s*4|پلی\s*استیشن\s*[4۴]/i.test(text)) return "دسته PS4";
  if (/xbox|ایکس\s*باکس/i.test(text)) return "دسته Xbox";
  return `دسته ${device.name || stationTypeLabel(String(device.deviceType ?? ""))}`;
}

function NewStationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { centerId, center, isCenterLoading } = useOwner();
  const canEdit = true;

  const initialCatalogId = searchParams.get("catalogId") ?? "";

  const [catalogDevices, setCatalogDevices] = useState<DeviceCatalogItem[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DynamicDeviceType[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReload, setCatalogReload] = useState(0);

  const [catalogId, setCatalogId] = useState(initialCatalogId);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isVip, setIsVip] = useState(false);
  const [extraControllerRows, setExtraControllerRows] = useState<ExtraControllerDraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    catalog?: string;
    name?: string;
    price?: string;
    quantity?: string;
    extraControllers?: string;
  }>({});

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    Promise.all([
      catalogService.listDevices({ isActive: true, limit: 100 }, controller.signal),
      catalogService.listDeviceTypes({ isActive: true, limit: 100 }, controller.signal).catch(() => []),
    ])
      .then(([items, types]) => {
        if (!active) return;
        setCatalogDevices(items);
        setDeviceTypes(types);
        setCatalogError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setCatalogError(getErrorMessage(e));
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [catalogReload]);

  const retryCatalog = () => {
    setCatalogLoading(true);
    setCatalogError(null);
    setCatalogReload((v) => v + 1);
  };

  const effectiveCatalogId = catalogId || catalogDevices[0]?.id || "";
  const selectedCatalogDevice = useMemo(
    () => catalogDevices.find((d) => d.id === effectiveCatalogId) ?? null,
    [catalogDevices, effectiveCatalogId]
  );

  const activeDynamicDeviceType = useMemo<DynamicDeviceType | null>(() => {
    if (!selectedCatalogDevice) return null;
    if (selectedCatalogDevice.deviceTypeRef) return selectedCatalogDevice.deviceTypeRef;
    if (selectedCatalogDevice.deviceTypeId) {
      const byId = deviceTypes.find((dt) => dt.id === selectedCatalogDevice.deviceTypeId);
      if (byId) return byId;
    }
    const cat = String(selectedCatalogDevice.deviceType ?? "").toUpperCase();
    return (
      deviceTypes.find((dt) => dt.category.toUpperCase() === cat && dt.extraControllerEnabled) ??
      deviceTypes.find((dt) => dt.category.toUpperCase() === cat) ??
      null
    );
  }, [selectedCatalogDevice, deviceTypes]);

  const supportsExtraControllers = Boolean(activeDynamicDeviceType?.extraControllerEnabled);
  const inferredControllerType = useMemo(
    () => inferControllerTypeForDevice(selectedCatalogDevice),
    [selectedCatalogDevice]
  );

  // همگام‌سازی خودکار نوع دسته اضافی هنگام تغییر دستگاه کاتالوگ
  useEffect(() => {
    setExtraControllerRows((prev) => {
      if (prev.length === 0) return prev;
      if (prev[0].controllerType === inferredControllerType) return prev;
      return [{ ...prev[0], controllerType: inferredControllerType }];
    });
  }, [inferredControllerType]);

  const hasExtraController = extraControllerRows.length > 0;
  const activeExtraRow = extraControllerRows[0] ?? null;

  const toggleExtraController = (enabled: boolean) => {
    if (fieldErrors.extraControllers) {
      setFieldErrors((prev) => ({ ...prev, extraControllers: undefined }));
    }
    if (enabled) {
      setExtraControllerRows([createEmptyExtraControllerRow(inferredControllerType)]);
    } else {
      setExtraControllerRows([]);
    }
  };

  const updateExtraControllerField = (patch: Partial<ExtraControllerDraftRow>) => {
    if (fieldErrors.extraControllers) {
      setFieldErrors((prev) => ({ ...prev, extraControllers: undefined }));
    }
    setExtraControllerRows((prev) => {
      const base = prev[0] ?? createEmptyExtraControllerRow(inferredControllerType);
      return [{ ...base, controllerType: inferredControllerType, ...patch }];
    });
  };

  const maxQuantity = 100;

  const catalogOptions = useMemo(
    () =>
      catalogDevices.map((d) => ({
        value: d.id,
        label: `${d.name} (${stationTypeLabel(String(d.deviceType ?? ""))})`,
      })),
    [catalogDevices]
  );

  const parsedPrice = parseAmount(price, toEnglishDigits);
  const priceHelper =
    parsedPrice !== null && parsedPrice > 0
      ? `${formatToman(parsedPrice)} تومان در هر ساعت`
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !centerId || !canEdit) return;

    const errors: typeof fieldErrors = {};
    const hourlyPrice = parseAmount(price, toEnglishDigits);
    const count = parseAmount(quantity, toEnglishDigits);
    const trimmedName = name.trim();

    if (!effectiveCatalogId) {
      errors.catalog = "یک دستگاه از کاتالوگ انتخاب کنید.";
    }
    if (hourlyPrice === null || hourlyPrice <= 0) {
      errors.price = "قیمت هر ساعت را به تومان و با عدد وارد کنید.";
    }
    if (count === null || !Number.isInteger(count) || count < 1 || count > maxQuantity) {
      errors.quantity = `تعداد را بین ۱ تا ${toPersianDigits(maxQuantity)} وارد کنید.`;
    }

    const extraValidation = supportsExtraControllers
      ? validateExtraControllerRows(extraControllerRows)
      : { configs: [] };
    if (extraValidation.error) {
      errors.extraControllers = extraValidation.error;
    }

    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0 || hourlyPrice === null || count === null) return;

    setSaving(true);
    const hourlyPriceRial = tomanToRial(hourlyPrice);
    try {
      const created = await ownerService.createStationsFromCatalog(centerId, {
        catalogDeviceId: effectiveCatalogId,
        quantity: count,
        hourlyPrice: hourlyPriceRial,
        customNamePrefix: trimmedName || undefined,
        isVip,
      });

      if (supportsExtraControllers && extraValidation.configs.length > 0 && created.length > 0) {
        await Promise.all(
          created.map((st) =>
            ownerService.syncStationExtraControllers(
              centerId,
              st.id,
              extraValidation.configs,
              []
            )
          )
        );
      }

      const n = created.length > 0 ? created.length : count;
      const msg = `${toPersianDigits(n)} دستگاه به گیمنت اضافه شد.`;
      router.push(`/owner/stations?toast=${encodeURIComponent(msg)}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!centerId && !isCenterLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]">
        <OwnerPageHeader title="افزودن دستگاه" backUrl="/owner/stations" isSubpage />
        <main className="mx-auto mt-16 w-full max-w-[var(--max-mini-app-width)] flex-1 px-4 py-8">
          <EmptyState
            title="گیمنتی پیدا نشد"
            description="ابتدا گیمنت خود را ثبت کنید، سپس دستگاه‌ها را مدیریت کنید."
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-12 text-[var(--text-white)]">
      <OwnerPageHeader title="افزودن دستگاه" backUrl="/owner/stations" isSubpage />

      <main className="mx-auto mt-16 flex w-full max-w-[var(--max-mini-app-width)] flex-1 flex-col gap-5 px-4 py-5 lg:px-0">
        {!canEdit && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-card border border-[var(--accent-yellow)]/40 bg-[var(--accent-yellow)]/10 p-4 text-xs font-bold leading-6 text-[var(--accent-yellow)]"
          >
            <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
            <span>
              افزودن دستگاه بعد از تأیید احراز هویت گیمنت فعال می‌شود.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* مرحله ۱: انتخاب دستگاه */}
          <section className="flex flex-col gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-black text-[var(--primary)]">
                ۱
              </span>
              <h2 className="text-sm font-bold text-[var(--text-white)]">انتخاب دستگاه</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              {catalogLoading ? (
                <Skeleton className="h-11" />
              ) : catalogError ? (
                <div className="flex items-center justify-between gap-3 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold text-[var(--accent-red)]">
                  <span>کاتالوگ بارگذاری نشد.</span>
                  <button
                    type="button"
                    onClick={retryCatalog}
                    className="h-9 px-2 text-[var(--text-white)] underline cursor-pointer"
                  >
                    تلاش دوباره
                  </button>
                </div>
              ) : catalogOptions.length === 0 ? (
                <p className="rounded-card border border-dashed border-[var(--border-color)] p-3 text-xs text-[var(--text-muted)]">
                  در کاتالوگ دستگاهی موجود نیست.
                </p>
              ) : (
                <SearchableSelect
                  options={catalogOptions}
                  value={effectiveCatalogId}
                  onChange={setCatalogId}
                  placeholder="انتخاب دستگاه"
                  searchPlaceholder="جستجوی دستگاه..."
                />
              )}
              {fieldErrors.catalog && (
                <span className="text-xs font-medium text-[var(--accent-red)]">
                  {fieldErrors.catalog}
                </span>
              )}
            </div>

            {selectedCatalogDevice && (
              <div className="flex items-center gap-3.5 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3">
                <span className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--foreground)]/40">
                  <SafeImage
                    src={
                      selectedCatalogDevice.coverImageUrl ||
                      stationImageFor(String(selectedCatalogDevice.deviceType ?? ""))
                    }
                    alt={selectedCatalogDevice.name}
                    fallbackSrc={PLACEHOLDERS.center}
                    className="h-full w-full object-contain p-1"
                  />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-[var(--text-white)]">
                    {selectedCatalogDevice.name}
                  </span>
                  <Badge variant="neutral">
                    {stationTypeLabel(String(selectedCatalogDevice.deviceType ?? ""))}
                  </Badge>
                </div>
              </div>
            )}
          </section>

          {/* مرحله ۲: تعرفه و تعداد */}
          <section className="flex flex-col gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-black text-[var(--primary)]">
                ۲
              </span>
              <h2 className="text-sm font-bold text-[var(--text-white)]">تعرفه و تعداد</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="قیمت هر ساعت (تومان)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                placeholder="۱۵۰۰۰۰"
                helperText={priceHelper}
                error={fieldErrors.price}
                disabled={saving || !canEdit}
              />
              <Input
                label="تعداد دستگاه"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="numeric"
                error={fieldErrors.quantity}
                disabled={saving || !canEdit}
              />
            </div>

            <Input
              label="نام دلخواه (اختیاری)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً PS5 VIP"
              error={fieldErrors.name}
              disabled={saving || !canEdit}
            />

            <OwnerToggleSwitch
              label="دستگاه VIP است"
              checked={isVip}
              onChange={setIsVip}
              disabled={saving || !canEdit}
            />
          </section>

          {/* مرحله ۳: دسته اضافی (خودکار بر اساس دستگاه) */}
          {supportsExtraControllers && (
            <section className="flex flex-col gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-black text-[var(--primary)]">
                    ۳
                  </span>
                  <h2 className="text-sm font-bold text-[var(--text-white)]">دسته اضافی</h2>
                </div>
                <Badge variant="neutral">{inferredControllerType}</Badge>
              </div>

              <OwnerToggleSwitch
                label={`افزودن ${inferredControllerType}`}
                checked={hasExtraController}
                onChange={toggleExtraController}
                disabled={saving || !canEdit}
              />

              {hasExtraController && activeExtraRow && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="تعداد دسته"
                    value={activeExtraRow.quantity}
                    onChange={(e) => updateExtraControllerField({ quantity: e.target.value })}
                    inputMode="numeric"
                    placeholder="۲"
                    disabled={saving || !canEdit}
                  />
                  <Input
                    label="قیمت هر ساعت (تومان)"
                    value={activeExtraRow.hourlyPrice}
                    onChange={(e) => updateExtraControllerField({ hourlyPrice: e.target.value })}
                    inputMode="numeric"
                    placeholder="۳۰۰۰۰"
                    helperText={(() => {
                      const p = parseAmount(activeExtraRow.hourlyPrice, toEnglishDigits);
                      return p !== null && p > 0 ? `${formatToman(p)} تومان / ساعت` : undefined;
                    })()}
                    disabled={saving || !canEdit}
                  />
                </div>
              )}

              {fieldErrors.extraControllers && (
                <span className="text-xs font-bold text-[var(--accent-red)]">
                  {fieldErrors.extraControllers}
                </span>
              )}
            </section>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-3 text-xs font-bold leading-6 text-[var(--accent-red)]"
            >
              <Icon name="alert" size={16} className="mt-1 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              size="lg"
              isLoading={saving}
              disabled={!canEdit || !centerId}
              className="w-full sm:flex-1"
            >
              ثبت دستگاه
            </Button>
            <Link href="/owner/stations" className="w-full sm:w-36">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={saving}
                className="w-full"
              >
                انصراف
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewOwnerStationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-[var(--bg-body)] text-[var(--text-white)]">
          <OwnerPageHeader title="افزودن دستگاه" backUrl="/owner/stations" isSubpage />
          <main className="mx-auto mt-16 w-full max-w-[var(--max-mini-app-width)] flex-1 px-4 py-6 lg:px-0">
            <Skeleton className="h-96" />
          </main>
        </div>
      }
    >
      <NewStationContent />
    </Suspense>
  );
}
