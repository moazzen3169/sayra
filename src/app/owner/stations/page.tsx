"use client";

import React, { useEffect, useState, useMemo } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { Option, SearchableSelect } from "@/components/ui/SearchableSelect";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { formatPrice, toPersianDigits } from "@/lib/format";
import { getErrorMessage, stationImageFor } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import { catalogService } from "@/services/catalogService";
import { deviceCategoryApi } from "@/services/gaming-center/device-category.api";
import { gamingCenterService } from "@/services/gamingCenterService";
import type { GameStationInfo } from "@/services/gamingCenterService";
import type { StationInput } from "@/types/owner";
import type { DeviceCatalogItem, GameCatalogItem } from "@/types/catalog";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const STATION_OPTIONS: Option[] = [
  { value: "PC", label: "PC (کامپیوتر گیمینگ)" },
  { value: "PLAYSTATION", label: "PLAYSTATION (پلی‌استیشن)" },
  { value: "XBOX", label: "XBOX (ایکس‌باکس)" },
  { value: "SWITCH", label: "SWITCH (نینتندو سوییچ)" },
  { value: "VR", label: "VR (واقعیت مجازی)" },
];

const inputClass =
  "h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]";

export default function OwnerStationsPage() {
  const { centerId, verificationStatus } = useOwner();
  const isApproved = verificationStatus === "APPROVED";
const [tableSearch, setTableSearch] = useState("");
  // Data states
  const [stations, setStations] = useState<GameStationInfo[] | null>(null);
  const [categories, setCategories] = useState<DeviceCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Active Category Filter for Drill-down
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | null>(null);
    

  // Notification / Toast Message
  const [statusFeedback, setStatusFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Add Station Modal
  const [openAddModal, setOpenAddModal] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"catalog" | "custom">("catalog");
  const [catalogDevices, setCatalogDevices] = useState<DeviceCatalogItem[]>([]);
  const [selectedCatalogDeviceId, setSelectedCatalogDeviceId] = useState<string>("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Add Station Form fields
  const [type, setType] = useState<StationInput["stationType"]>("PC");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customPrefix, setCustomPrefix] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [defaultControllers, setDefaultControllers] = useState("2");
  const [maxExtraControllers, setMaxExtraControllers] = useState("2");
  const [extraControllerPrice, setExtraControllerPrice] = useState("50000");
  const [description, setDescription] = useState("");

  // Quick Price Edit Modal/State
  const [quickPriceStation, setQuickPriceStation] = useState<GameStationInfo | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState("");
  const [savingQuickPrice, setSavingQuickPrice] = useState(false);
  const [quickPriceError, setQuickPriceError] = useState<string | null>(null);

  // Edit Station Modal
  const [editingStation, setEditingStation] = useState<GameStationInfo | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"PC" | "CONSOLE" | "VR">("CONSOLE");
  const [editPrice, setEditPrice] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete Station Confirmation
  const [deletingStation, setDeletingStation] = useState<GameStationInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Games Section States
  const [gamesList, setGamesList] = useState<string[]>([]);
  const [gamesCatalog, setGamesCatalog] = useState<GameCatalogItem[]>([]);
  const [catalogGamesLoading, setCatalogGamesLoading] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const [gamePlatformFilter, setGamePlatformFilter] = useState<string>("ALL");
  const [gamesMsg, setGamesMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAddGamesModal, setShowAddGamesModal] = useState(false);
  const [selectedCatalogGameIds, setSelectedCatalogGameIds] = useState<string[]>([]);
  const [isSavingCatalogGames, setIsSavingCatalogGames] = useState(false);

  // Auto-dismiss status feedback toast
  useEffect(() => {
    if (!statusFeedback) return;
    const timer = setTimeout(() => setStatusFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [statusFeedback]);

  // 1. Load Stations and Device Categories
  useEffect(() => {
    if (!centerId) {
      setStations([]);
      setCategories([]);
      return;
    }

    let active = true;
    setStations(null);
    setCategories(null);
    setError(null);
    setCategoriesError(null);
    const c = new AbortController();

    // Fetch stations
    ownerService
      .listStations(centerId, c.signal)
      .then((d) => {
        if (!active) return;
        setStations(Array.isArray(d) ? d : []);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setStations([]);
      });

    // Fetch device categories
    deviceCategoryApi
      .getDeviceCategories(centerId, c.signal)
      .then((cats) => {
        if (!active) return;
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setCategoriesError(getErrorMessage(e));
        setCategories([]);
      });

    return () => {
      active = false;
      c.abort();
    };
  }, [centerId, reload]);

  // 2. Load Center Games & Initial Catalog Games
  useEffect(() => {
    if (!centerId) return;
    let active = true;
    const c = new AbortController();

    gamingCenterService
      .getCenter(centerId, c.signal)
      .then((center) => {
        if (!active) return;
        const g = (center as unknown as { games?: string[] })?.games;
        if (Array.isArray(g)) {
          setGamesList(g);
        } else {
          setGamesList((prev) => (prev.length > 0 ? prev : ["EA Sports FC 25", "GTA V", "Mortal Kombat 1"]));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      c.abort();
    };
  }, [centerId]);

  // 3. Load Catalog Devices when opening Add Modal
  useEffect(() => {
    if (openAddModal) {
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
  }, [openAddModal, selectedCatalogDeviceId]);

  // 4. Load Catalog Games for Add Games Modal
  useEffect(() => {
    if (showAddGamesModal) {
      setCatalogGamesLoading(true);
      catalogService
        .listGames({
          limit: 60,
          search: gameSearch.trim() || undefined,
          platform: gamePlatformFilter !== "ALL" ? (gamePlatformFilter as unknown as any) : undefined,
          isActive: true,
        })
        .then((res) => {
          setGamesCatalog(res);
        })
        .catch(() => {
          setGamesCatalog([]);
        })
        .finally(() => {
          setCatalogGamesLoading(false);
        });
    }
  }, [showAddGamesModal, gameSearch, gamePlatformFilter]);

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

  // Filter stations based on selected catalog category and search
  const filteredStations = useMemo(() => {
    if (!stations) return [];
    let list = stations;

    if (selectedCategory) {
      list = list.filter((s) => {
        if (selectedCategory.catalogId && s.catalogDeviceId) {
          return s.catalogDeviceId === selectedCategory.catalogId;
        }
        const catType = (selectedCategory.deviceType || "").toUpperCase();
        const sType = (s.stationType || "").toUpperCase();
        if (catType === sType) return true;
        if (catType.includes("PS") && sType === "PLAYSTATION") return true;
        if (catType.includes("XBOX") && sType === "XBOX") return true;
        if (catType === "PC" && sType === "PC") return true;
        if (catType.includes("VR") && sType === "VR") return true;
        return false;
      });
    }

    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.stationType && s.stationType.toLowerCase().includes(q))
      );
    }

    return list;
  }, [stations, selectedCategory, tableSearch]);

  // Open Quick Price Change Modal
  const handleOpenQuickPrice = (station: GameStationInfo) => {
    setQuickPriceStation(station);
    setQuickPriceValue(station.hourlyPrice ? String(station.hourlyPrice) : "");
    setQuickPriceError(null);
  };

  // Submit Quick Price Change
  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceStation || !centerId || savingQuickPrice) return;

    const hourlyRate = Number(quickPriceValue);
    if (!isFinite(hourlyRate) || hourlyRate <= 0) {
      setQuickPriceError("مبلغ ساعتی معتبر وارد کنید.");
      return;
    }

    setSavingQuickPrice(true);
    setQuickPriceError(null);

    try {
      const mappedType: "PC" | "CONSOLE" | "VR" =
        quickPriceStation.stationType === "PC"
          ? "PC"
          : quickPriceStation.stationType === "VR"
          ? "VR"
          : "CONSOLE";

      await ownerService.updateStation(centerId, quickPriceStation.id, {
        name: quickPriceStation.name,
        type: mappedType,
        hourlyRate,
        isActive: quickPriceStation.isActive !== false,
      });

      setStatusFeedback({
        ok: true,
        text: `قیمت ساعتی دستگاه «${quickPriceStation.name}» به ${formatPrice(hourlyRate)} تومان تغییر یافت.`,
      });
      setQuickPriceStation(null);
      setReload((v) => v + 1);
    } catch (err) {
      setQuickPriceError(getErrorMessage(err));
    } finally {
      setSavingQuickPrice(false);
    }
  };

  // Helper to open Edit modal
  const handleOpenEdit = (station: GameStationInfo) => {
    setEditingStation(station);
    setEditName(station.name || "");
    const mappedType: "PC" | "CONSOLE" | "VR" =
      station.stationType === "PC"
        ? "PC"
        : station.stationType === "VR"
        ? "VR"
        : "CONSOLE";
    setEditType(mappedType);
    setEditPrice(station.hourlyPrice ? String(station.hourlyPrice) : "");
    setEditIsActive(station.isActive !== false);
    setEditFormError(null);
  };

  // Submit Edit Station (PATCH /gamingCenters/{id}/stations/{stationId})
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation || !centerId || savingEdit) return;

    const hourlyRate = Number(editPrice);
    if (!isFinite(hourlyRate) || hourlyRate <= 0) {
      setEditFormError("قیمت ساعتی معتبر را وارد کنید.");
      return;
    }

    setSavingEdit(true);
    setEditFormError(null);

    try {
      await ownerService.updateStation(centerId, editingStation.id, {
        name: editName.trim() || editingStation.name,
        type: editType,
        hourlyRate,
        isActive: editIsActive,
      });

      setStatusFeedback({
        ok: true,
        text: `مشخصات دستگاه «${editName.trim() || editingStation.name}» با موفقیت به‌روزرسانی شد.`,
      });
      setEditingStation(null);
      setReload((v) => v + 1);
    } catch (err) {
      setEditFormError(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Station (DELETE /gamingCenters/{id}/stations/{stationId})
  const handleDeleteStation = async () => {
    if (!deletingStation || !centerId || deleting) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await ownerService.deleteStation(centerId, deletingStation.id);
      setStatusFeedback({
        ok: true,
        text: `دستگاه «${deletingStation.name}» با موفقیت حذف شد.`,
      });
      setDeletingStation(null);
      setReload((v) => v + 1);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // Submit Add Station (POST /gamingCenters/{id}/stations OR /from-catalog)
  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId || savingAdd) return;

    const hourlyPrice = Number(price);
    if (!isFinite(hourlyPrice) || hourlyPrice <= 0) {
      setAddFormError("قیمت ساعتی معتبر را وارد کنید.");
      return;
    }

    setSavingAdd(true);
    setAddFormError(null);

    try {
      if (addMode === "catalog") {
        if (!selectedCatalogDeviceId) {
          setAddFormError("دستگاه مورد نظر را از کاتالوگ انتخاب کنید.");
          setSavingAdd(false);
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
        const selectedLabel =
          STATION_OPTIONS.find((o) => o.value === type)?.label.split(" ")[0] || type;
        const count = (stations?.length || 0) + 1;
        const autoName =
          customPrefix.trim() || `${selectedLabel} #${toPersianDigits(count)}`;

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

      setStatusFeedback({
        ok: true,
        text: "دستگاه جدید با موفقیت به گیم‌نت اضافه شد.",
      });

      setOpenAddModal(false);
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
      setAddFormError(getErrorMessage(err));
    } finally {
      setSavingAdd(false);
    }
  };

  // Toggle or select game from catalog modal
  const toggleCatalogGameSelect = (gameId: string) => {
    setSelectedCatalogGameIds((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  // Save games selected from catalog to Gaming Center
  const handleSaveCatalogGames = async () => {
    if (!centerId || selectedCatalogGameIds.length === 0 || isSavingCatalogGames) return;
    setIsSavingCatalogGames(true);
    try {
      const res = await ownerService.addGamesFromCatalog(centerId, selectedCatalogGameIds);
      if (res.allGames && Array.isArray(res.allGames) && res.allGames.length > 0) {
        setGamesList(res.allGames);
      } else if (res.addedGames && Array.isArray(res.addedGames)) {
        setGamesList((prev) => Array.from(new Set([...prev, ...res.addedGames])));
      } else {
        const addedTitles = gamesCatalog
          .filter((g) => selectedCatalogGameIds.includes(g.id))
          .map((g) => g.title);
        setGamesList((prev) => Array.from(new Set([...prev, ...addedTitles])));
      }

      setGamesMsg({
        ok: true,
        text: `${toPersianDigits(selectedCatalogGameIds.length)} بازی با موفقیت به گیم‌نت اضافه شد.`,
      });
      setSelectedCatalogGameIds([]);
      setShowAddGamesModal(false);
    } catch (err) {
      setGamesMsg({
        ok: false,
        text: `خطا در افزودن بازی‌ها: ${getErrorMessage(err)}`,
      });
    } finally {
      setIsSavingCatalogGames(false);
    }
  };

  const removeGame = (gameName: string) => {
    setGamesList((prev) => prev.filter((g) => g !== gameName));
    setGamesMsg({ ok: true, text: `بازی «${gameName}» از نمایش گیم‌نت حذف شد.` });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-12">
      <OwnerPageHeader title="دستگاه‌ها و بازی‌ها" backUrl="/owner" />

      {/* Global Feedback Banner */}
      {statusFeedback && (
        <div className="fixed top-18 right-4 left-4 max-w-md mx-auto z-50">
          <div
            className={cn(
              "p-3.5 rounded-xl shadow-lg border text-xs font-bold flex items-center justify-between gap-3 transition-all",
              statusFeedback.ok
                ? "bg-[var(--bg-card)] border-[var(--accent-green)] text-[var(--accent-green)]"
                : "bg-[var(--bg-card)] border-[var(--accent-red)] text-[var(--accent-red)]"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon name={statusFeedback.ok ? "check" : "alert"} size={16} />
              <span>{statusFeedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 mt-16 px-4 py-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-8">

        {/* ========================================================
            بخش ۱: کاتالوگ دستگاه‌ها (انتخاب دسته‌بندی برای فیلتر جدول)
            ======================================================== */}
        <section className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-white)]">
                کاتالوگ دستگاه‌های گیم‌نت
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                روی هر کاتالوگ کلیک کنید تا دستگاه‌های مربوط به آن در جدول زیر نمایش داده و مدیریت شوند.
              </p>
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="px-3 py-1.5 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--primary)] hover:bg-[var(--foreground)]/80 transition-all flex items-center gap-1.5 cursor-pointer border border-[var(--border-subtle)]"
              >
                <span>مشاهده همه دستگاه‌ها</span>
                <span className="text-[10px] bg-[var(--primary)] text-black rounded-full px-1.5 py-0.2">
                  ✕
                </span>
              </button>
            )}
          </div>

          {categories === null && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse"
                />
              ))}
            </div>
          )}

          {categoriesError && (
            <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 text-xs text-[var(--accent-red)]">
              {categoriesError}
            </div>
          )}

          {categories && categories.length === 0 && !categoriesError && (
            <div className="p-6 text-center rounded-card bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
              هنوز کاتالوگ فعالی ثبت نشده است. با دکمه «+ افزودن دستگاه»، اولین دستگاه را اضافه کنید.
            </div>
          )}

          {categories && categories.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat) => {
                const isSelected = selectedCategory?.name === cat.name;
                return (
                  <button
                    key={`${cat.catalogId || "custom"}-${cat.name}`}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(isSelected ? null : cat)
                    }
                    className={cn(
                      "flex flex-col gap-2 rounded-card border p-3 text-right transition-all active:scale-[0.98] cursor-pointer group text-xs",
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 shadow-md ring-1 ring-[var(--primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                    )}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-[var(--foreground)]/40">
                      <SafeImage
                        src={cat.coverImageUrl || ""}
                        alt={cat.name}
                        fallbackSrc={PLACEHOLDERS.center}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-bold text-black">
                        {toPersianDigits(cat.deviceCount)}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-col gap-0.5 mt-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="truncate text-xs sm:text-sm font-bold text-[var(--text-white)]">
                          {cat.name}
                        </h3>
                        {isSelected && (
                          <span className="text-[10px] text-[var(--primary)] font-bold shrink-0">
                            انتخاب‌شده
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] truncate">
                        پلتفرم: {cat.deviceType || "سفارشی"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================
            بخش ۲: جدول مرتب و مینیمال دستگاه‌ها (با فیلتر بر اساس کاتالوگ)
            ======================================================== */}
        <section className="flex flex-col gap-3 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-5 shadow-sm">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[var(--text-white)]">
                {selectedCategory
                  ? `دستگاه‌های «${selectedCategory.name}»`
                  : "تمامی دستگاه‌های گیم‌نت"}
              </h2>
              {stations && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--foreground)]/50 text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {toPersianDigits(filteredStations.length)} دستگاه
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="جستجوی نام دستگاه..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="h-9 w-40 sm:w-52 pl-3 pr-8 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                />
                <span className="absolute right-2.5 top-2.5 text-[var(--text-muted)] pointer-events-none">
                  <Icon name="search" size={14} />
                </span>
              </div>

              <button
                type="button"
                disabled={!isApproved}
                onClick={() => setOpenAddModal(true)}
                className="h-9 px-3.5 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Icon name="plus" size={14} />
                <span>+ افزودن دستگاه</span>
              </button>
            </div>
          </div>

          {stations === null && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-[var(--text-muted)] animate-pulse">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              <span>در حال بارگذاری اطلاعات دستگاه‌ها...</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 text-xs text-[var(--accent-red)]">
              {error}
            </div>
          )}

          {stations && !error && filteredStations.length === 0 && (
            <div className="p-8 text-center rounded-card bg-[var(--foreground)]/10 border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex flex-col items-center gap-2">
              <span>دستگاهی مطابق با فیلتر فعلی یافت نشد.</span>
              {(selectedCategory || tableSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setTableSearch("");
                  }}
                  className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
                >
                  پاک کردن فیلترها و مشاهده همه
                </button>
              )}
            </div>
          )}

          {/* Minimal & Professional Table */}
          {stations && filteredStations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--foreground)]/20">
                    <th className="py-3 px-3 font-semibold w-10 text-center">#</th>
                    <th className="py-3 px-3 font-semibold">نام دستگاه</th>
                    <th className="py-3 px-3 font-semibold">پلتفرم</th>
                    <th className="py-3 px-3 font-semibold">وضعیت</th>
                    <th className="py-3 px-3 font-semibold">قیمت ساعتی</th>
                    <th className="py-3 px-3 font-semibold text-center w-40">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredStations.map((s, index) => {
                    const isStationActive = s.isActive !== false;
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-[var(--foreground)]/20 transition-colors group"
                      >
                        {/* Row Index */}
                        <td className="py-3 px-3 text-center text-[var(--text-muted)] font-mono">
                          {toPersianDigits(index + 1)}
                        </td>

                        {/* Station Name & Info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-[var(--foreground)] flex items-center justify-center p-1 shrink-0 border border-[var(--border-subtle)]">
                              <img
                                src={stationImageFor(s.stationType)}
                                alt={s.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[var(--text-white)] truncate text-xs sm:text-sm">
                                {s.name}
                              </span>
                              {s.quantity && s.quantity > 1 ? (
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  موجودی: {toPersianDigits(s.quantity)} دستگاه
                                </span>
                              ) : null}
                            </div>
                            {s.isVip && (
                              <span className="px-1.5 py-0.2 rounded bg-[var(--primary)] text-black text-[10px] font-bold">
                                VIP
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Station Type */}
                        <td className="py-3 px-3 text-[var(--text-muted)]">
                          <span className="px-2 py-0.5 rounded bg-[var(--foreground)]/40 border border-[var(--border-subtle)] font-mono text-[11px]">
                            {s.stationType}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          {isStationActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-green)]/15 text-[var(--accent-green)] text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]" />
                              فعال
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent-red)]/15 text-[var(--accent-red)] text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]" />
                              غیرفعال
                            </span>
                          )}
                        </td>

                        {/* Hourly Rate + Quick Change */}
                        <td className="py-3 px-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-white)]">
                              {formatPrice(s.hourlyPrice)}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">تومان/ساعت</span>
                            <button
                              type="button"
                              onClick={() => handleOpenQuickPrice(s)}
                              title="تغییر سریع قیمت"
                              className="text-[11px] px-1.5 py-0.5 rounded text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-colors cursor-pointer border border-transparent hover:border-[var(--primary)]/30"
                            >
                              تغییر
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Details */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(s)}
                              className="px-2.5 py-1.5 rounded-card bg-[var(--foreground)]/50 hover:bg-[var(--foreground)] text-[var(--text-white)] transition-all flex items-center gap-1 cursor-pointer border border-[var(--border-subtle)] text-[11px] font-bold"
                              title="ویرایش مشخصات کامل"
                            >
                              <Icon name="edit" size={13} />
                              <span className="hidden sm:inline">ویرایش</span>
                            </button>

                            {/* Delete Station */}
                            <button
                              type="button"
                              onClick={() => setDeletingStation(s)}
                              className="px-2.5 py-1.5 rounded-card bg-[var(--accent-red)]/10 hover:bg-[var(--accent-red)]/20 text-[var(--accent-red)] transition-all flex items-center gap-1 cursor-pointer border border-[var(--accent-red)]/20 text-[11px] font-bold"
                              title="حذف دستگاه"
                            >
                              <Icon name="trash" size={13} />
                              <span className="hidden sm:inline">حذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ========================================================
            بخش ۳: بازی‌های گیم‌نت و کاتالوگ بازی‌ها
            ======================================================== */}
        <section className="p-5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-white)]">
                بازی‌های فعال در گیم‌نت
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                بازی‌های موجود را از کاتالوگ مرکزی انتخاب کرده و به لیست این مرکز اضافه کنید.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddGamesModal(true)}
                className="px-3.5 py-1.5 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Icon name="plus" size={14} />
                <span>+ انتخاب از کاتالوگ بازی‌ها</span>
              </button>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                {toPersianDigits(gamesList.length)} بازی
              </span>
            </div>
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

          <div className="flex flex-wrap gap-2 min-h-[50px] p-3.5 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] items-center">
            {gamesList.length === 0 ? (
              <span className="text-xs text-[var(--text-muted)]">
                هنوز هیچ بازی به این گیم‌نت متصل نشده است. از دکمه بالا برای افزودن بازی‌ها از کاتالوگ استفاده کنید.
              </span>
            ) : (
              gamesList.map((game) => (
                <span
                  key={game}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-bold"
                >
                  <span>{game}</span>
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
        </section>
      </main>

      {/* ========================================================
          مودال ۱: افزودن دستگاه جدید (کاتالوگ یا سفارشی)
          ======================================================== */}
      {openAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !savingAdd && setOpenAddModal(false)}
        >
          <form
            onSubmit={submitAdd}
            className="w-full max-w-[480px] max-h-[92vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-card p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-white)]">
                افزودن دستگاه به گیم‌نت
              </h3>
              <div className="flex rounded-lg bg-[var(--foreground)]/40 p-1 border border-[var(--border-subtle)] text-xs">
                <button
                  type="button"
                  onClick={() => setAddMode("catalog")}
                  className={`px-3 py-1 rounded-md transition-all font-bold cursor-pointer ${
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
                  className={`px-3 py-1 rounded-md transition-all font-bold cursor-pointer ${
                    addMode === "custom"
                      ? "bg-[var(--primary)] text-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
                  }`}
                >
                  سفارشی / دستی
                </button>
              </div>
            </div>

            {addFormError && (
              <p className="text-xs font-bold text-[var(--accent-red)]">{addFormError}</p>
            )}

            {addMode === "catalog" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">
                  انتخاب دستگاه از کاتالوگ مرکزی
                </label>
                {catalogLoading ? (
                  <div className="h-10 rounded-card bg-[var(--foreground)]/20 animate-pulse" />
                ) : catalogDevices.length === 0 ? (
                  <div className="p-3 text-xs text-[var(--text-muted)] bg-[var(--foreground)]/20 rounded-card">
                    دستگاهی در کاتالوگ یافت نشد، از تب «سفارشی / دستی» استفاده کنید.
                  </div>
                ) : (
                  <select
                    className={inputClass}
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
                <label className="text-xs font-bold text-[var(--text-muted)]">
                  نوع پلتفرم دستگاه
                </label>
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
                className={inputClass}
                type="text"
                placeholder={addMode === "catalog" ? "مثلاً PS5 VIP" : "مثلاً سیستم شماره ۱"}
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">
                قیمت دستگاه برای ۱ ساعت (تومان)
              </label>
              <input
                className={inputClass}
                type="number"
                min={0}
                placeholder="مثلاً ۱۵۰,۰۰۰"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">
                تعداد موجود از این دستگاه
              </label>
              <input
                className={inputClass}
                type="number"
                min={1}
                placeholder="مثلاً ۵"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVipStation"
                checked={isVip}
                onChange={(e) => setIsVip(e.target.checked)}
                className="cursor-pointer"
              />
              <label
                htmlFor="isVipStation"
                className="text-xs font-bold text-[var(--text-white)] cursor-pointer"
              >
                این دستگاه(ها) به عنوان VIP ثبت شوند
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={savingAdd}
                className="flex-1 h-10 rounded-card bg-[var(--primary)] text-black font-bold text-xs disabled:opacity-60 cursor-pointer"
              >
                {savingAdd ? "در حال ثبت..." : "ثبت دستگاه"}
              </button>
              <button
                type="button"
                onClick={() => setOpenAddModal(false)}
                className="h-10 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          مودال ۲: تغییر سریع قیمت دستگاه
          ======================================================== */}
      {quickPriceStation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => !savingQuickPrice && setQuickPriceStation(null)}
        >
          <form
            onSubmit={handleSaveQuickPrice}
            className="w-full max-w-[380px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex flex-col gap-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <h3 className="text-sm font-bold text-[var(--text-white)]">
                تغییر قیمت «{quickPriceStation.name}»
              </h3>
              <button
                type="button"
                onClick={() => setQuickPriceStation(null)}
                className="text-xs text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {quickPriceError && (
              <p className="text-xs font-bold text-[var(--accent-red)]">{quickPriceError}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">
                قیمت جدید هر ساعت (تومان)
              </label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={quickPriceValue}
                onChange={(e) => setQuickPriceValue(e.target.value)}
                placeholder="مثلاً ۱۵۰,۰۰۰"
                autoFocus
              />
              <span className="text-[11px] text-[var(--text-muted)]">
                قیمت فعلی: {formatPrice(quickPriceStation.hourlyPrice)} تومان
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={savingQuickPrice}
                className="flex-1 h-10 rounded-card bg-[var(--primary)] text-black font-bold text-xs disabled:opacity-60 cursor-pointer"
              >
                {savingQuickPrice ? "در حال ذخیره..." : "ثبت قیمت"}
              </button>
              <button
                type="button"
                onClick={() => setQuickPriceStation(null)}
                className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          مودال ۳: ویرایش کامل دستگاه (PATCH /gamingCenters/{id}/stations/{stationId})
          ======================================================== */}
      {editingStation && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm sm:p-4"
          onClick={() => !savingEdit && setEditingStation(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-[460px] max-h-[92vh] overflow-y-auto bg-[var(--bg-card)] border-t sm:border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-card p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-white)]">
                ویرایش مشخصات دستگاه
              </h3>
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="text-xs text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editFormError && (
              <p className="text-xs font-bold text-[var(--accent-red)]">{editFormError}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نام دستگاه</label>
              <input
                className={inputClass}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="مثلاً سیستم شماره ۱"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نوع پلتفرم</label>
              <select
                className={inputClass}
                value={editType}
                onChange={(e) => setEditType(e.target.value as "PC" | "CONSOLE" | "VR")}
              >
                <option value="PC">PC (کامپیوتر گیمینگ)</option>
                <option value="CONSOLE">CONSOLE (کنسول بازی)</option>
                <option value="VR">VR (واقعیت مجازی)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">
                قیمت ساعتی (تومان)
              </label>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="مثلاً ۱۵۰,۰۰۰"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActiveCheck"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="cursor-pointer"
              />
              <label
                htmlFor="editIsActiveCheck"
                className="text-xs font-bold text-[var(--text-white)] cursor-pointer"
              >
                دستگاه فعال است و قابل رزرو می‌باشد
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 h-10 rounded-card bg-[var(--primary)] text-black font-bold text-xs disabled:opacity-60 cursor-pointer"
              >
                {savingEdit ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="h-10 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          مودال ۴: تایید حذف دستگاه (DELETE /gamingCenters/{id}/stations/{stationId})
          ======================================================== */}
      {deletingStation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => !deleting && setDeletingStation(null)}
        >
          <div
            className="w-full max-w-[400px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex flex-col gap-4 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[var(--text-white)]">
              حذف دستگاه «{deletingStation.name}»
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              آیا از حذف این دستگاه اطمینان دارید؟ پس از حذف، این دستگاه از لیست گیم‌نت خارج شده و مشتریان قادر به رزرو آن نخواهند بود.
            </p>

            {deleteError && (
              <p className="text-xs font-bold text-[var(--accent-red)]">{deleteError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteStation}
                className="flex-1 h-10 rounded-card bg-[var(--accent-red)] text-white font-bold text-xs disabled:opacity-60 cursor-pointer"
              >
                {deleting ? "در حال حذف..." : "بله، حذف شود"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingStation(null)}
                className="h-10 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          مودال ۵: انتخاب بازی‌ها از کاتالوگ مرکزی و افزودن به گیم‌نت
          ======================================================== */}
      {showAddGamesModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
          onClick={() => !isSavingCatalogGames && setShowAddGamesModal(false)}
        >
          <div
            className="w-full max-w-[650px] max-h-[90vh] flex flex-col bg-[var(--bg-card)] border-t sm:border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-white)]">
                  انتخاب بازی از کاتالوگ مرکزی
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  بازی‌های مورد نظر را تیک بزنید تا به گیم‌نت اضافه شوند.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGamesModal(false)}
                className="text-sm font-bold text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row gap-2 bg-[var(--foreground)]/10">
              <input
                type="text"
                placeholder="جستجوی عنوان بازی (مثلا FIFA, Mortal Kombat)..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                className="flex-1 h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none placeholder:text-[var(--text-muted)]"
              />
              <select
                value={gamePlatformFilter}
                onChange={(e) => setGamePlatformFilter(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none"
              >
                <option value="ALL">همه پلتفرم‌ها</option>
                <option value="PC">PC</option>
                <option value="PLAYSTATION">PLAYSTATION</option>
                <option value="XBOX">XBOX</option>
                <option value="SWITCH">SWITCH</option>
                <option value="VR">VR</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-[280px]">
              {catalogGamesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-36 rounded-card bg-[var(--foreground)]/20 animate-pulse"
                    />
                  ))}
                </div>
              ) : gamesCatalog.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                  هیچ بازی مطابق با جستجو در کاتالوگ یافت نشد.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gamesCatalog.map((game) => {
                    const isSelected = selectedCatalogGameIds.includes(game.id);
                    const isAlreadyAdded = gamesList.includes(game.title);

                    return (
                      <button
                        key={game.id}
                        type="button"
                        disabled={isAlreadyAdded}
                        onClick={() => toggleCatalogGameSelect(game.id)}
                        className={cn(
                          "flex flex-col gap-2 rounded-card border p-2 text-right transition-all relative text-xs cursor-pointer",
                          isAlreadyAdded
                            ? "opacity-50 border-[var(--border-subtle)] bg-[var(--foreground)]/10 cursor-not-allowed"
                            : isSelected
                            ? "border-[var(--primary)] bg-[var(--primary-muted)] shadow-sm"
                            : "border-[var(--border-subtle)] bg-[var(--foreground)]/30 hover:border-[var(--border-color)]"
                        )}
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-black/40">
                          <SafeImage
                            src={game.coverImageUrl || ""}
                            alt={game.title}
                            fallbackSrc={PLACEHOLDERS.center}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          {isSelected && (
                            <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[var(--primary)] text-black font-bold flex items-center justify-center text-xs">
                              ✓
                            </span>
                          )}
                          {isAlreadyAdded && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-[var(--text-muted)] font-bold">
                              موجود در گیم‌نت
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-bold text-[var(--text-white)] truncate">
                            {game.title}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">
                            {game.genre || game.supportedPlatforms?.join(", ") || "بازی ویدیویی"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--text-muted)]">
                {selectedCatalogGameIds.length > 0
                  ? `${toPersianDigits(selectedCatalogGameIds.length)} بازی انتخاب شده`
                  : "بازی‌های مورد نظر را انتخاب کنید"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGamesModal(false)}
                  className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-white)] cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={selectedCatalogGameIds.length === 0 || isSavingCatalogGames}
                  onClick={handleSaveCatalogGames}
                  className="h-10 px-5 rounded-card bg-[var(--primary)] text-black text-xs font-bold disabled:opacity-50 cursor-pointer shadow"
                >
                  {isSavingCatalogGames ? "در حال افزودن..." : "افزودن بازی‌های انتخاب شده"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
