"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { IRAN_PROVINCES } from "@/data/iranLocations";
import { LocationMapPicker } from "@/components/owner/LocationMapPicker";
import { Icon } from "@/components/ui/Icon";

const inputClass =
  "w-full h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] transition-colors";

export default function OwnerEditPage() {
  const { centerId, center, refreshCenters } = useOwner();
  const [loaded, setLoaded] = useState(false);

  // ۱. ویرایش اطلاعات اولیه گیم‌نت (نام)
  const [name, setName] = useState(center?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ۲. ویرایش کامل آدرس گیم‌نت (استان، شهر، آدرس دقیق، کدپستی، تلفن، مختصات نقشه)
  const [province, setProvince] = useState("تهران");
  const [city, setCity] = useState("تهران");
  const [addressLine, setAddressLine] = useState(center?.description || "");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [lat, setLat] = useState<number>(35.6892);
  const [lng, setLng] = useState<number>(51.389);
  const [geoLocating, setGeoLocating] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    if (!centerId) {
      setLoaded(true);
      return;
    }

    const controller = new AbortController();

    Promise.allSettled([
      ownerService.findCenter(centerId, controller.signal),
      ownerService.listAddresses(centerId, controller.signal),
    ]).then(([centerRes, addressesRes]) => {
      if (!active) return;

      if (centerRes.status === "fulfilled" && centerRes.value) {
        setName(centerRes.value.name || "");
        if (centerRes.value.description && !addressLine) {
          setAddressLine(centerRes.value.description);
        }
      } else if (center) {
        setName(center.name || "");
        if (center.description && !addressLine) {
          setAddressLine(center.description);
        }
      }

      if (addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value) && addressesRes.value.length > 0) {
        const primaryAddr = addressesRes.value[0] as any;
        if (primaryAddr?.addressLine || primaryAddr?.address) {
          setAddressLine(primaryAddr.addressLine || primaryAddr.address);
        }
        if (primaryAddr?.city) {
          setCity(primaryAddr.city);
        }
        if (primaryAddr?.province) {
          setProvince(primaryAddr.province);
        }
        if (primaryAddr?.phone) {
          setPhone(primaryAddr.phone);
        }
        if (primaryAddr?.postalCode) {
          setPostalCode(primaryAddr.postalCode);
        }
        if (typeof primaryAddr?.lat === "number" && !isNaN(primaryAddr.lat)) {
          setLat(primaryAddr.lat);
        }
        if (typeof primaryAddr?.lng === "number" && !isNaN(primaryAddr.lng)) {
          setLng(primaryAddr.lng);
        }
      }

      setLoaded(true);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, center]);

  const handleProvinceChange = (provName: string) => {
    setProvince(provName);
    const found = IRAN_PROVINCES.find((p) => p.name === provName);
    if (found) {
      if (found.cities.length > 0) {
        setCity(found.cities[0]);
      }
      setLat(found.defaultLat);
      setLng(found.defaultLng);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setAddressMsg({ ok: false, text: "مرورگر شما از قابلیت موقعیت‌یابی پشتیبانی نمی‌کند." });
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(Number(position.coords.latitude.toFixed(6)));
        setLng(Number(position.coords.longitude.toFixed(6)));
        setGeoLocating(false);
        setAddressMsg({ ok: true, text: "موقعیت کنونی شما روی نقشه تنظیم شد." });
      },
      () => {
        setGeoLocating(false);
        setAddressMsg({ ok: false, text: "امکان دریافت موقعیت مکانی شما وجود نداشت." });
      }
    );
  };

  // ذخیره نام با درخواست API جداگانه
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingName || !centerId) return;
    if (!name.trim()) {
      setNameMsg({ ok: false, text: "لطفاً نام گیمنت را وارد کنید." });
      return;
    }

    setSavingName(true);
    setNameMsg(null);
    try {
      await ownerService.patchCenter(centerId, { name: name.trim() });
      try {
        await refreshCenters();
      } catch {
        // ignore
      }
      setNameMsg({ ok: true, text: "نام گیمنت با موفقیت ذخیره شد." });
    } catch (err) {
      setNameMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSavingName(false);
    }
  };

  // ذخیره آدرس کامل با درخواست API جداگانه
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAddress || !centerId) return;

    if (!addressLine.trim()) {
      setAddressMsg({ ok: false, text: "لطفاً آدرس دقیق گیمنت را وارد کنید." });
      return;
    }
    if (!city.trim()) {
      setAddressMsg({ ok: false, text: "لطفاً شهر را انتخاب کنید." });
      return;
    }

    setSavingAddress(true);
    setAddressMsg(null);

    const userEnteredAddress = addressLine.trim();
    const fullAddressString = `${province}، ${city.trim()}، ${userEnteredAddress}`;

    try {
      await ownerService.createAddress(centerId, {
        addressLine: userEnteredAddress,
        address: fullAddressString,
        city: city.trim(),
        province: province.trim() || undefined,
        phone: phone.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        lat,
        lng,
      });

      await ownerService.patchCenter(centerId, {
        address: fullAddressString,
        phone: phone.trim() || undefined,
      }).catch(() => {
        // Fallback gracefully if patchCenter is partial
      });

      try {
        await refreshCenters();
      } catch {
        // ignore
      }

      setAddressMsg({ ok: true, text: "آدرس و موقعیت مکانی گیمنت با موفقیت ثبت و ذخیره شد." });
    } catch (err) {
      setAddressMsg({ ok: false, text: getErrorMessage(err) });
    } finally {
      setSavingAddress(false);
    }
  };

  const currentProvinceInfo = IRAN_PROVINCES.find((p) => p.name === province) || IRAN_PROVINCES[0];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="ویرایش گیمنت" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[var(--max-mini-app-width)] lg:mx-auto lg:w-full lg:px-0 flex flex-col gap-6">
        {!loaded ? (
          <div className="flex flex-col gap-4">
            <div className="h-32 rounded-card bg-[var(--bg-card)] animate-pulse" />
            <div className="h-64 rounded-card bg-[var(--bg-card)] animate-pulse" />
          </div>
        ) : (
          <>
            {/* ۱. بخش ویرایش اطلاعات اولیه گیم‌نت (نام) با درخواست جدا */}
            <form
              onSubmit={handleSaveName}
              className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]"></span>
                  <h2 className="text-sm font-bold text-[var(--text-white)]">اطلاعات اولیه گیمنت</h2>
                </div>
                <span className="text-xs text-[var(--text-subtle)]">ویرایش نام گیمنت</span>
              </div>

              {nameMsg && (
                <div
                  className={`p-3 rounded-card text-xs font-bold ${
                    nameMsg.ok
                      ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                      : "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
                  }`}
                >
                  {nameMsg.text}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">
                  نام گیمنت <span className="text-[var(--accent-red)]">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="نام گیمنت را وارد کنید"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingName}
                  className="px-6 h-11 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 cursor-pointer shadow"
                >
                  {savingName ? "در حال ذخیره..." : "ذخیره نام گیمنت"}
                </button>
              </div>
            </form>

            {/* ۲. بخش ویرایش کامل آدرس با درخواست API جدا و دکمه ذخیره‌سازی جداگانه */}
            <form
              onSubmit={handleSaveAddress}
              className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-5 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="pin" size={18} className="text-[var(--primary)]" />
                  <h2 className="text-sm font-bold text-[var(--text-white)]">ویرایش کامل آدرس و موقعیت مکانی</h2>
                </div>
                <span className="text-xs text-[var(--text-subtle)]">موقعیت و آدرس گیمنت</span>
              </div>

              {addressMsg && (
                <div
                  className={`p-3 rounded-card text-xs font-bold ${
                    addressMsg.ok
                      ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                      : "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
                  }`}
                >
                  {addressMsg.text}
                </div>
              )}

              {/* استان و شهر */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">
                    استان <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <select
                    value={province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className={inputClass}
                  >
                    {IRAN_PROVINCES.map((prov) => (
                      <option key={prov.name} value={prov.name} className="bg-[var(--bg-card)]">
                        {prov.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">
                    شهر <span className="text-[var(--accent-red)]">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                  >
                    {currentProvinceInfo.cities.map((c) => (
                      <option key={c} value={c} className="bg-[var(--bg-card)]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* شماره تماس و کد پستی */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">شماره تماس مجموعه</label>
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="02188888888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`${inputClass} text-left font-mono`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[var(--text-white)]">کد پستی (اختیاری)</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="کد پستی ۱۰ رقمی"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className={`${inputClass} text-left font-mono`}
                  />
                </div>
              </div>

              {/* آدرس دقیق */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">
                  آدرس دقیق گیمنت <span className="text-[var(--accent-red)]">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="خیابان، کوچه، پلاک، طبقه یا نشانی دقیق گیمنت را وارد کنید"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] transition-colors"
                  required
                />
              </div>

              {/* انتخاب و مشاهده از روی نقشه */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-white)]">موقعیت گیمنت روی نقشه</span>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={geoLocating}
                    className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Icon name="pin" size={14} />
                    {geoLocating ? "در حال دریافت..." : "تنظیم روی موقعیت کنونی من"}
                  </button>
                </div>

                <LocationMapPicker
                  latitude={lat}
                  longitude={lng}
                  cityName={city}
                  provinceName={province}
                  onChange={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }}
                />
              </div>

              {/* دکمه اختصاصی ذخیره‌سازی آدرس */}
              <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-6 h-11 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 cursor-pointer shadow"
                >
                  {savingAddress ? "در حال ذخیره‌سازی آدرس..." : "ذخیره آدرس گیمنت"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
