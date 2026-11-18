"use client";

import React, { useEffect, useState } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminBreadcrumbs } from "@/components/admin/layout/AdminBreadcrumbs";
import { catalogService } from "@/services/catalogService";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/reservationUi";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import type { DeviceCatalogItem, DeviceType, GameCatalogItem } from "@/types/catalog";

const DEVICE_TYPES: { value: DeviceType; label: string }[] = [
  { value: "PC", label: "کامپیوتر گیمینگ (PC)" },
  { value: "PLAYSTATION", label: "پلی‌استیشن (PlayStation)" },
  { value: "XBOX", label: "ایکس‌باکس (Xbox)" },
  { value: "SWITCH", label: "نینتندو سوییچ (Switch)" },
  { value: "VR", label: "واقعیت مجازی (VR)" },
];

const SHORT_PLATFORM_LABELS: Record<string, string> = {
  PC: "PC",
  PLAYSTATION: "PlayStation",
  XBOX: "Xbox",
  SWITCH: "Switch",
  VR: "VR",
};

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<"devices" | "games">("devices");

  // ---------- Devices State ----------
  const [devices, setDevices] = useState<DeviceCatalogItem[] | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [devicesReload, setDevicesReload] = useState(0);

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);
  const [deviceFormError, setDeviceFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("PC");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [selectedFilterType, setSelectedFilterType] = useState<string>("ALL");
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");

  // ---------- Games State ----------
  const [games, setGames] = useState<GameCatalogItem[] | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesReload, setGamesReload] = useState(0);

  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameCatalogItem | null>(null);
  const [savingGame, setSavingGame] = useState(false);
  const [gameFormError, setGameFormError] = useState<string | null>(null);

  const [gameTitle, setGameTitle] = useState("");
  const [gamePlatforms, setGamePlatforms] = useState<DeviceType[]>(["PC", "PLAYSTATION"]);
  const [gameGenre, setGameGenre] = useState("");
  const [gameCoverUrl, setGameCoverUrl] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [gameIsActive, setGameIsActive] = useState(true);

  const [selectedGamePlatform, setSelectedGamePlatform] = useState<string>("ALL");
  const [gameSearchQuery, setGameSearchQuery] = useState("");

  // Fetch Devices
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    catalogService
      .listAdminDevices(
        {
          limit: 100,
          deviceType: selectedFilterType === "ALL" ? undefined : selectedFilterType,
          search: deviceSearchQuery.trim() || undefined,
        },
        controller.signal
      )
      .then((res) => {
        if (!active) return;
        setDevices(res.items);
        setDevicesError(null);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        catalogService
          .listDevices({ limit: 100 }, controller.signal)
          .then((items) => {
            if (!active) return;
            setDevices(items);
            setDevicesError(null);
          })
          .catch(() => {
            if (active) setDevicesError("خطا در بارگذاری فهرست دستگاه‌های کاتالوگ.");
          });
      })
      .finally(() => {
        if (active) setDevicesLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [devicesReload, selectedFilterType, deviceSearchQuery]);

  // Fetch Games
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    catalogService
      .listAdminGames(
        {
          limit: 100,
          platform: selectedGamePlatform === "ALL" ? undefined : selectedGamePlatform,
          search: gameSearchQuery.trim() || undefined,
        },
        controller.signal
      )
      .then((res) => {
        if (!active) return;
        setGames(res.items);
        setGamesError(null);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        catalogService
          .listGames(
            {
              limit: 100,
              platform: selectedGamePlatform === "ALL" ? undefined : selectedGamePlatform,
              search: gameSearchQuery.trim() || undefined,
            },
            controller.signal
          )
          .then((items) => {
            if (!active) return;
            setGames(items);
            setGamesError(null);
          })
          .catch(() => {
            if (active) setGamesError("خطا در بارگذاری فهرست بازی‌های کاتالوگ.");
          });
      })
      .finally(() => {
        if (active) setGamesLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamesReload, selectedGamePlatform, gameSearchQuery]);

  // ---------- Device Handlers ----------
  const reloadDevices = () => {
    setDevicesLoading(true);
    setDevicesError(null);
    setDevicesReload((v) => v + 1);
  };

  const handleDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coverImageUrl.trim()) {
      setDeviceFormError("نام دستگاه و آدرس تصویر الزامی هستند.");
      return;
    }
    setSavingDevice(true);
    setDeviceFormError(null);

    try {
      await catalogService.createAdminDevice({
        name: name.trim(),
        deviceType,
        coverImageUrl: coverImageUrl.trim(),
        description: description.trim() || undefined,
        isActive,
      });
      setIsDeviceModalOpen(false);
      setName("");
      setCoverImageUrl("");
      setDescription("");
      setIsActive(true);
      reloadDevices();
    } catch (err) {
      setDeviceFormError(getErrorMessage(err));
    } finally {
      setSavingDevice(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm("آیا از غیرفعال‌سازی این دستگاه در کاتالوگ اطمینان دارید؟")) return;
    try {
      await catalogService.deleteAdminDevice(id);
      reloadDevices();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  // ---------- Game Handlers ----------
  const reloadGames = () => {
    setGamesLoading(true);
    setGamesError(null);
    setGamesReload((v) => v + 1);
  };

  const openCreateGameModal = () => {
    setEditingGame(null);
    setGameTitle("");
    setGamePlatforms(["PC", "PLAYSTATION"]);
    setGameGenre("");
    setGameCoverUrl("");
    setGameDescription("");
    setGameIsActive(true);
    setGameFormError(null);
    setIsGameModalOpen(true);
  };

  const openEditGameModal = (game: GameCatalogItem) => {
    setEditingGame(game);
    setGameTitle(game.title);
    setGamePlatforms(game.supportedPlatforms?.length ? game.supportedPlatforms : ["PC"]);
    setGameGenre(game.genre || "");
    setGameCoverUrl(game.coverImageUrl || "");
    setGameDescription(game.description || "");
    setGameIsActive(game.isActive !== false);
    setGameFormError(null);
    setIsGameModalOpen(true);
  };

  const toggleGamePlatform = (platform: DeviceType) => {
    setGamePlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameTitle.trim()) {
      setGameFormError("نام بازی الزامی است.");
      return;
    }
    if (gamePlatforms.length === 0) {
      setGameFormError("حداقل یک پلتفرم پشتیبانی‌شده انتخاب کنید.");
      return;
    }

    setSavingGame(true);
    setGameFormError(null);

    try {
      if (editingGame) {
        await catalogService.updateAdminGame(editingGame.id, {
          title: gameTitle.trim(),
          supportedPlatforms: gamePlatforms,
          genre: gameGenre.trim() || null,
          coverImageUrl: gameCoverUrl.trim() || null,
          description: gameDescription.trim() || null,
          isActive: gameIsActive,
        });
      } else {
        await catalogService.createAdminGame({
          title: gameTitle.trim(),
          supportedPlatforms: gamePlatforms,
          genre: gameGenre.trim() || undefined,
          coverImageUrl: gameCoverUrl.trim() || undefined,
          description: gameDescription.trim() || undefined,
          isActive: gameIsActive,
        });
      }
      setIsGameModalOpen(false);
      setEditingGame(null);
      reloadGames();
    } catch (err) {
      setGameFormError(getErrorMessage(err));
    } finally {
      setSavingGame(false);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm("آیا از غیرفعال‌سازی این بازی در کاتالوگ اطمینان دارید؟")) return;
    try {
      await catalogService.deleteAdminGame(id);
      reloadGames();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <AdminBreadcrumbs items={[{ label: "داشبورد", href: "/admin" }, { label: "کاتالوگ پلتفرم" }]} />
            <h1 className="text-xl font-bold text-[var(--text-white)] mt-1">
              {activeTab === "devices"
                ? "کاتالوگ سراسری تجهیزات و دستگاه‌ها"
                : "کاتالوگ سراسری بازی‌ها"}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {activeTab === "devices"
                ? "مدیریت دستگاه‌های استاندارد و پایه که مدیران گیم‌نت‌ها می‌توانند به مجموعه‌های خود اضافه کنند."
                : "تعریف و مدیریت بازی‌های پلتفرم تا مدیران گیم‌نت‌ها بتوانند آن‌ها را انتخاب و به گیم‌نت خود اضافه کنند."}
            </p>
          </div>
          {activeTab === "devices" ? (
            <button
              type="button"
              onClick={() => setIsDeviceModalOpen(true)}
              className="h-10 px-4 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow cursor-pointer"
            >
              + افزودن دستگاه به کاتالوگ
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateGameModal}
              className="h-10 px-4 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow cursor-pointer"
            >
              + افزودن بازی به کاتالوگ
            </button>
          )}
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="بخش‌های کاتالوگ"
          className="inline-flex w-fit gap-1 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-1"
        >
          {(
            [
              ["devices", "دستگاه‌ها"],
              ["games", "بازی‌ها"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`h-9 px-5 rounded-card text-xs font-bold transition-colors cursor-pointer ${
                activeTab === tab
                  ? "bg-[var(--primary)] text-black"
                  : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "devices" ? (
          <>
            {/* Device Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <input
                  type="text"
                  placeholder="جستجوی نام یا مشخصات دستگاه..."
                  value={deviceSearchQuery}
                  onChange={(e) => {
                    setDevicesLoading(true);
                    setDeviceSearchQuery(e.target.value);
                  }}
                  className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">دسته‌بندی:</span>
                <select
                  value={selectedFilterType}
                  onChange={(e) => {
                    setDevicesLoading(true);
                    setSelectedFilterType(e.target.value);
                  }}
                  className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none cursor-pointer"
                >
                  <option value="ALL">همه دسته‌ها</option>
                  {DEVICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Devices Grid */}
            {devicesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 rounded-card bg-[var(--bg-card)] animate-pulse" />
                ))}
              </div>
            )}

            {devicesError && (
              <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)]">
                {devicesError}
              </div>
            )}

            {!devicesLoading && devices && devices.length === 0 && (
              <div className="p-12 text-center rounded-card bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                دستگاهی در کاتالوگ یافت نشد. می‌توانید با کلیک بر روی دکمه بالای صفحه اولین دستگاه را اضافه کنید.
              </div>
            )}

            {!devicesLoading && devices && devices.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-[var(--primary)]/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                        <SafeImage
                          src={device.coverImageUrl || ""}
                          alt={device.name}
                          fallbackSrc={PLACEHOLDERS.center}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[var(--text-white)] truncate">{device.name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
                            {device.deviceType}
                          </span>
                        </div>
                        {device.description && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{device.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                      <span className={`font-bold ${device.isActive ? "text-[var(--accent-green)]" : "text-[var(--text-muted)]"}`}>
                        {device.isActive ? "فعال در کاتالوگ" : "غیرفعال"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDevice(device.id)}
                        className="text-xs text-[var(--accent-red)] hover:underline cursor-pointer"
                      >
                        غیرفعال‌سازی
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Game Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <input
                  type="text"
                  placeholder="جستجوی نام یا ژانر بازی..."
                  value={gameSearchQuery}
                  onChange={(e) => {
                    setGamesLoading(true);
                    setGameSearchQuery(e.target.value);
                  }}
                  className="w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">پلتفرم:</span>
                <select
                  value={selectedGamePlatform}
                  onChange={(e) => {
                    setGamesLoading(true);
                    setSelectedGamePlatform(e.target.value);
                  }}
                  className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none cursor-pointer"
                >
                  <option value="ALL">همه پلتفرم‌ها</option>
                  {DEVICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Games Grid */}
            {gamesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 rounded-card bg-[var(--bg-card)] animate-pulse" />
                ))}
              </div>
            )}

            {gamesError && (
              <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)]">
                {gamesError}
              </div>
            )}

            {!gamesLoading && games && games.length === 0 && (
              <div className="p-12 text-center rounded-card bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                بازی‌ای در کاتالوگ یافت نشد. می‌توانید با کلیک بر روی دکمه «افزودن بازی به کاتالوگ» اولین بازی را تعریف کنید.
              </div>
            )}

            {!gamesLoading && games && games.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-[var(--primary)]/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-20 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                        <SafeImage
                          src={game.coverImageUrl || ""}
                          alt={game.title}
                          fallbackSrc={PLACEHOLDERS.center}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-[var(--text-white)] truncate">
                            {game.title}
                          </h3>
                          {game.genre && (
                            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[var(--foreground)] text-[var(--text-muted)] font-bold">
                              {game.genre}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(game.supportedPlatforms ?? []).map((p) => (
                            <span
                              key={String(p)}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold"
                            >
                              {SHORT_PLATFORM_LABELS[String(p)] ?? String(p)}
                            </span>
                          ))}
                        </div>
                        {game.description && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1.5">
                            {game.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
                      <span
                        className={`font-bold ${
                          game.isActive ? "text-[var(--accent-green)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {game.isActive ? "فعال در کاتالوگ" : "غیرفعال"}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditGameModal(game)}
                          className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGame(game.id)}
                          className="text-xs text-[var(--accent-red)] hover:underline cursor-pointer"
                        >
                          غیرفعال‌سازی
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal افزودن دستگاه جدید به کاتالوگ پلتفرم */}
      {isDeviceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => !savingDevice && setIsDeviceModalOpen(false)}
        >
          <form
            onSubmit={handleDeviceSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 flex flex-col gap-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-[var(--text-white)]">افزودن دستگاه جدید به کاتالوگ ادمین</h3>
            {deviceFormError && <p className="text-xs font-bold text-[var(--accent-red)]">{deviceFormError}</p>}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نام دستگاه</label>
              <input
                type="text"
                placeholder="مثلاً PlayStation 5 Slim یا PC گیمینگ نسل ۱۴"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نوع پلتفرم</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none cursor-pointer"
              >
                {DEVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">آدرس تصویر دستگاه (URL)</label>
              <input
                type="url"
                placeholder="https://example.com/ps5.png یا /img/PS5.png"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">توضیحات و مشخصات</label>
              <textarea
                rows={3}
                placeholder="مشخصات سخت‌افزاری و ویژگی‌ها..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActiveCatalog"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="cursor-pointer"
              />
              <label htmlFor="isActiveCatalog" className="text-xs text-[var(--text-white)] cursor-pointer">
                این دستگاه بلافاصله برای صاحبان گیم‌نت‌ها فعال باشد
              </label>
            </div>

            <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="submit"
                disabled={savingDevice}
                className="flex-1 h-10 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {savingDevice ? "در حال ثبت..." : "افزودن به کاتالوگ"}
              </button>
              <button
                type="button"
                onClick={() => setIsDeviceModalOpen(false)}
                className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal افزودن / ویرایش بازی در کاتالوگ پلتفرم */}
      {isGameModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => !savingGame && setIsGameModalOpen(false)}
        >
          <form
            onSubmit={handleGameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-6 flex flex-col gap-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-[var(--text-white)]">
              {editingGame ? "ویرایش بازی در کاتالوگ" : "افزودن بازی جدید به کاتالوگ"}
            </h3>
            {gameFormError && (
              <p className="text-xs font-bold text-[var(--accent-red)]">{gameFormError}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">نام بازی</label>
              <input
                type="text"
                placeholder="مثلاً EA Sports FC 25 یا Counter-Strike 2"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[var(--text-muted)]">پلتفرم‌های پشتیبانی‌شده</span>
              <div className="flex flex-wrap gap-2">
                {DEVICE_TYPES.map((t) => {
                  const selected = gamePlatforms.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleGamePlatform(t.value)}
                      className={`h-9 px-3 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
                        selected
                          ? "border-[var(--primary)] bg-[var(--primary)] text-black"
                          : "border-[var(--border-subtle)] bg-[var(--foreground)]/40 text-[var(--text-white)] hover:border-[var(--border-color)]"
                      }`}
                    >
                      {SHORT_PLATFORM_LABELS[String(t.value)] ?? t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">ژانر (اختیاری)</label>
                <input
                  type="text"
                  placeholder="مثلاً ورزشی، اکشن، مسابقه‌ای"
                  value={gameGenre}
                  onChange={(e) => setGameGenre(e.target.value)}
                  className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">آدرس تصویر کاور (اختیاری)</label>
                <input
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={gameCoverUrl}
                  onChange={(e) => setGameCoverUrl(e.target.value)}
                  className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">توضیحات (اختیاری)</label>
              <textarea
                rows={3}
                placeholder="توضیحات کوتاه درباره بازی..."
                value={gameDescription}
                onChange={(e) => setGameDescription(e.target.value)}
                className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActiveGameCatalog"
                checked={gameIsActive}
                onChange={(e) => setGameIsActive(e.target.checked)}
                className="cursor-pointer"
              />
              <label htmlFor="isActiveGameCatalog" className="text-xs text-[var(--text-white)] cursor-pointer">
                این بازی بلافاصله برای مدیران گیم‌نت‌ها قابل انتخاب باشد
              </label>
            </div>

            <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="submit"
                disabled={savingGame}
                className="flex-1 h-10 rounded-card bg-[var(--primary)] text-black font-bold text-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
              >
                {savingGame
                  ? "در حال ذخیره..."
                  : editingGame
                    ? "ذخیره تغییرات"
                    : "افزودن به کاتالوگ"}
              </button>
              <button
                type="button"
                onClick={() => setIsGameModalOpen(false)}
                disabled={savingGame}
                className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminPageContainer>
  );
}
