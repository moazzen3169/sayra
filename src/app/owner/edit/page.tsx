"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { OwnerGallerySection } from "@/components/owner/OwnerGallerySection";
import { useOwner } from "@/context/OwnerContext";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { IRAN_PROVINCES } from "@/data/iranLocations";
import { LocationMapPicker } from "@/components/owner/LocationMapPicker";
import { geocodeIranLocation } from "@/lib/iranGeocoding";
import { Icon } from "@/components/ui/Icon";

const inputClass =
  "w-full h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)] transition-colors";

export default function OwnerEditPage() {
  const { centerId, center, refreshCenters, verificationStatus } = useOwner();
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
  const [lat, setLat] = useState<number>(37.5527);
  const [lng, setLng] = useState<number>(45.0761);
  const [mapZoom, setMapZoom] = useState<number>(14);
  const geocodeAbortRef = React.useRef<AbortController | null>(null);
  const [primaryAddressId, setPrimaryAddressId] = useState<string | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMsg, setAddressMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const centerRef = React.useRef(center);
  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    let active = true;

    if (!centerId) {
      setLoaded(true);
      return;
    }

    const controller = new AbortController();

    const toCoord = (v: unknown): number | null => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      return null;
    };

    const centerPromise =
      verificationStatus === "APPROVED"
        ? ownerService.findCenter(centerId, controller.signal, {
            allowListFallback: false,
          })
        : Promise.resolve(centerRef.current);

    Promise.allSettled([
      centerPromise,
      ownerService.listAddresses(centerId, controller.signal),
    ]).then(([centerRes, addressesRes]) => {
      if (!active) return;

      const fallbackCenter = centerRef.current;
      if (centerRes.status === "fulfilled" && centerRes.value) {
        setName(centerRes.value.name || "");
        if (centerRes.value.description) {
          setAddressLine((prev) => prev || centerRes.value!.description || "");
        }
      } else if (fallbackCenter) {
        setName(fallbackCenter.name || "");
        if (fallbackCenter.description) {
          setAddressLine((prev) => prev || fallbackCenter.description || "");
        }
      }

      if (addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value) && addressesRes.value.length > 0) {
        const list = addressesRes.value as Array<Record<string, unknown>>;
        const primaryAddr =
          list.find((a) => Boolean(a?.isPrimary) && toCoord(a?.lat ?? a?.latitude) !== null && toCoord(a?.lng ?? a?.longitude) !== null) ??
          [...list].reverse().find((a) => toCoord(a?.lat ?? a?.latitude) !== null && toCoord(a?.lng ?? a?.longitude) !== null) ??
          list.find((a) => Boolean(a?.isPrimary)) ??
          list[list.length - 1];

        const pickPlaceName = (val: unknown): string => {
          if (typeof val === "string" && val.trim()) return val.trim();
          if (val && typeof val === "object" && typeof (val as { name?: unknown }).name === "string") {
            return String((val as { name: string }).name).trim();
          }
          return "";
        };

        if (primaryAddr?.id) {
          setPrimaryAddressId(String(primaryAddr.id));
        }
        if (typeof (primaryAddr?.addressLine || primaryAddr?.address) === "string") {
          setAddressLine(String(primaryAddr.addressLine || primaryAddr.address));
        }
        const resolvedCity = pickPlaceName(primaryAddr?.city) || pickPlaceName(primaryAddr?.cityName);
        if (resolvedCity) {
          setCity(resolvedCity);
        }
        const resolvedProvince =
          pickPlaceName(primaryAddr?.province) || pickPlaceName(primaryAddr?.provinceName);
        if (resolvedProvince) {
          setProvince(resolvedProvince);
        }
        if (typeof primaryAddr?.phone === "string" && primaryAddr.phone) {
          setPhone(primaryAddr.phone);
        }
        if (typeof primaryAddr?.postalCode === "string" && primaryAddr.postalCode) {
          setPostalCode(primaryAddr.postalCode);
        }
        const parsedLat = toCoord(primaryAddr?.lat ?? primaryAddr?.latitude);
        const parsedLng = toCoord(primaryAddr?.lng ?? primaryAddr?.longitude);
        if (parsedLat !== null) {
          setLat(parsedLat);
        }
        if (parsedLng !== null) {
          setLng(parsedLng);
        }
      }

      setLoaded(true);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [centerId, verificationStatus]);

  const centerMapOnRegion = (provName: string, nextCity: string) => {
    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
    }
    const controller = new AbortController();
    geocodeAbortRef.current = controller;
    geocodeIranLocation(provName, nextCity, controller.signal).then((viewport) => {
      if (!viewport || controller.signal.aborted) return;
      setLat(viewport.lat);
      setLng(viewport.lng);
      setMapZoom(viewport.zoom);
    });
  };

  const handleProvinceChange = (provName: string) => {
    setProvince(provName);
    const found = IRAN_PROVINCES.find((p) => p.name === provName);
    const nextCity = found && found.cities.length > 0 ? found.cities[0] : "";
    if (nextCity) {
      setCity(nextCity);
    }
    if (found) {
      setLat(found.defaultLat);
      setLng(found.defaultLng);
      setMapZoom(nextCity ? 13 : 11);
    }
    centerMapOnRegion(provName, nextCity);
  };

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    centerMapOnRegion(province, nextCity);
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
      const addressPayload = {
        addressLine: userEnteredAddress,
        address: fullAddressString,
        city: city.trim(),
        province: province.trim() || undefined,
        phone: phone.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        lat,
        lng,
        isPrimary: true,
      };

      if (primaryAddressId) {
        try {
          await ownerService.updateAddress(centerId, primaryAddressId, addressPayload);
        } catch {
          const created = await ownerService.createAddress(centerId, addressPayload);
          if (created?.id) setPrimaryAddressId(String(created.id));
        }
      } else {
        const created = await ownerService.createAddress(centerId, addressPayload);
        if (created?.id) setPrimaryAddressId(String(created.id));
      }

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
      <OwnerPageHeader title="اطلاعات و گالری" backUrl="/owner" />

      <main className="flex-1 mt-16 px-4 py-4 lg:max-w-[var(--max-mini-app-width)] lg:mx-auto lg:w-full lg:px-0 flex flex-col gap-5">
        {!loaded ? (
          <div className="flex flex-col gap-4">
            <div className="h-32 rounded-card bg-[var(--bg-card)] animate-pulse" />
            <div className="h-64 rounded-card bg-[var(--bg-card)] animate-pulse" />
          </div>
        ) : (
          <>
            {/* ۱. نام گیم‌نت */}
            <form
              onSubmit={handleSaveName}
              className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                <h2 className="text-sm font-bold text-[var(--text-white)]">نام گیم‌نت</h2>
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

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  aria-label="نام گیم‌نت"
                  className={`${inputClass} sm:flex-1`}
                  placeholder="نام گیم‌نت را وارد کنید"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={savingName}
                  className="w-full sm:w-auto shrink-0 px-6 h-11 rounded-card bg-[var(--primary)] text-on-primary font-bold text-xs hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 cursor-pointer shadow"
                >
                  {savingName ? "در حال ذخیره..." : "ذخیره نام"}
                </button>
              </div>
            </form>

            {/* ۲. آدرس و موقعیت مکانی */}
            <form
              onSubmit={handleSaveAddress}
              className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm"
            >
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                <Icon name="pin" size={18} className="text-[var(--primary)]" />
                <h2 className="text-sm font-bold text-[var(--text-white)]">آدرس و موقعیت</h2>
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
                    onChange={(e) => handleCityChange(e.target.value)}
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

              {/* انتخاب موقعیت از روی نقشه */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={geoLocating}
                    className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Icon name="pin" size={14} />
                    {geoLocating ? "در حال دریافت..." : "موقعیت کنونی من"}
                  </button>
                </div>

                <LocationMapPicker
                  latitude={lat}
                  longitude={lng}
                  zoom={mapZoom}
                  cityName={city}
                  provinceName={province}
                  showCoordinates={false}
                  onChange={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="w-full sm:w-auto px-6 h-11 rounded-card bg-[var(--primary)] text-on-primary font-bold text-xs hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 cursor-pointer shadow"
                >
                  {savingAddress ? "در حال ذخیره..." : "ذخیره آدرس"}
                </button>
              </div>
            </form>

            {/* ۳. گالری تصاویر گیم‌نت */}
            {centerId && (
              <OwnerGallerySection
                centerId={centerId}
                centerSlug={center?.slug}
                isApproved={verificationStatus === "APPROVED"}
              />
            )}

            {/* لینک به ساعات کاری و قوانین رزرو */}
            <Link
              href="/owner/hours"
              className="p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)]/50 transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <Icon name="clock" size={18} />
                </div>
                <span className="text-sm font-bold text-[var(--text-white)] truncate">
                  ساعات کاری و رزرو
                </span>
              </div>
              <Icon name="arrow-left" size={16} className="text-[var(--text-muted)] shrink-0" />
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
