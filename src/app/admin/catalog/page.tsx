"use client";

import React, { useEffect, useState } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminBreadcrumbs } from "@/components/admin/layout/AdminBreadcrumbs";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { CatalogImagePicker } from "@/components/admin/catalog/CatalogImagePicker";
import { catalogService } from "@/services/catalogService";
import { isAbortError } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/reservationUi";
import { PLACEHOLDERS } from "@/lib/media";
import type {
  DeviceCatalogItem,
  DeviceType,
  DynamicDeviceType,
  GameCatalogItem,
} from "@/types/catalog";

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

function findMatchingDeviceType(
  deviceTypes: DynamicDeviceType[] | null,
  deviceTypeId?: string | null,
  category?: string | null
): DynamicDeviceType | undefined {
  if (!deviceTypes || deviceTypes.length === 0) return undefined;
  if (deviceTypeId) {
    const byId = deviceTypes.find((dt) => dt.id === deviceTypeId);
    if (byId) return byId;
  }
  if (category) {
    const norm = category.toUpperCase();
    return (
      deviceTypes.find((dt) => dt.category.toUpperCase() === norm && dt.isActive) ||
      deviceTypes.find((dt) => dt.category.toUpperCase() === norm)
    );
  }
  return undefined;
}

interface CardIconActionsProps {
  isActive: boolean;
  isToggling?: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CardIconActions: React.FC<CardIconActionsProps> = ({
  isActive,
  isToggling = false,
  onToggleActive,
  onEdit,
  onDelete,
}) => (
  <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
    <button
      type="button"
      disabled={isToggling}
      onClick={onToggleActive}
      title={isActive ? "فعال (کلیک برای غیرفعال‌سازی)" : "غیرفعال (کلیک برای فعال‌سازی)"}
      aria-label={isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
      className={`w-9 h-9 rounded-card inline-flex items-center justify-center border transition-colors cursor-pointer disabled:opacity-50 ${
        isActive
          ? "bg-[var(--accent-green)]/15 border-[var(--accent-green)]/30 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/25"
          : "bg-[var(--foreground)]/40 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-white)]"
      }`}
    >
      <Icon name={isActive ? "check" : "close"} size={16} />
    </button>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        title="ویرایش"
        aria-label="ویرایش"
        className="w-9 h-9 rounded-card bg-[var(--foreground)]/40 hover:bg-[var(--primary)]/15 border border-[var(--border-subtle)] hover:border-[var(--primary)]/40 text-[var(--text-muted)] hover:text-[var(--primary)] inline-flex items-center justify-center transition-colors cursor-pointer"
      >
        <Icon name="edit" size={16} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="حذف"
        aria-label="حذف"
        className="w-9 h-9 rounded-card bg-[var(--accent-red)]/10 hover:bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/25 text-[var(--accent-red)] inline-flex items-center justify-center transition-colors cursor-pointer"
      >
        <Icon name="trash" size={16} />
      </button>
    </div>
  </div>
);

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<"devices" | "games">("devices");

  // ---------- Devices State ----------
  const [devices, setDevices] = useState<DeviceCatalogItem[] | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [devicesReload, setDevicesReload] = useState(0);
  const [togglingDeviceId, setTogglingDeviceId] = useState<string | null>(null);

  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceCatalogItem | null>(null);
  const [savingDevice, setSavingDevice] = useState(false);
  const [deviceFormError, setDeviceFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("PC");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [deviceExtraControllerEnabled, setDeviceExtraControllerEnabled] = useState(false);

  const [selectedFilterType, setSelectedFilterType] = useState<string>("ALL");
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");

  // ---------- Device Types (synced seamlessly in background) ----------
  const [deviceTypes, setDeviceTypes] = useState<DynamicDeviceType[] | null>(null);
  const [deviceTypesReload, setDeviceTypesReload] = useState(0);

  // ---------- Games State ----------
  const [games, setGames] = useState<GameCatalogItem[] | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesReload, setGamesReload] = useState(0);
  const [togglingGameId, setTogglingGameId] = useState<string | null>(null);

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

  // Fetch Device Types (for syncing extraControllerEnabled)
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    catalogService
      .listAdminDeviceTypes({ limit: 100 }, controller.signal)
      .then((res) => {
        if (active) setDeviceTypes(res.items);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        catalogService
          .listDeviceTypes({ limit: 100 }, controller.signal)
          .then((items) => {
            if (active) setDeviceTypes(items);
          })
          .catch(() => {});
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [deviceTypesReload]);

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
          .listGames({ limit: 100 }, controller.signal)
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

  const openCreateDeviceModal = () => {
    setEditingDevice(null);
    setName("");
    const defaultType: DeviceType = "PC";
    setDeviceType(defaultType);
    setCoverImageUrl("");
    setDescription("");
    setIsActive(true);
    const matched = findMatchingDeviceType(deviceTypes, null, defaultType);
    setDeviceExtraControllerEnabled(Boolean(matched?.extraControllerEnabled));
    setDeviceFormError(null);
    setIsDeviceModalOpen(true);
  };

  const openEditDeviceModal = (device: DeviceCatalogItem) => {
    setEditingDevice(device);
    setName(device.name);
    setDeviceType(device.deviceType);
    setCoverImageUrl(device.coverImageUrl || "");
    setDescription(device.description || "");
    setIsActive(device.isActive !== false);
    const matched = findMatchingDeviceType(deviceTypes, device.deviceTypeId, device.deviceType);
    const extraEnabled =
      device.deviceTypeRef?.extraControllerEnabled ?? matched?.extraControllerEnabled ?? false;
    setDeviceExtraControllerEnabled(Boolean(extraEnabled));
    setDeviceFormError(null);
    setIsDeviceModalOpen(true);
  };

  const handleDeviceTypeChangeInModal = (nextType: DeviceType) => {
    setDeviceType(nextType);
    const matched = findMatchingDeviceType(deviceTypes, null, nextType);
    setDeviceExtraControllerEnabled(Boolean(matched?.extraControllerEnabled));
  };

  const handleDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !coverImageUrl.trim()) {
      setDeviceFormError("نام دستگاه و تصویر دستگاه الزامی هستند.");
      return;
    }
    setSavingDevice(true);
    setDeviceFormError(null);

    try {
      if (editingDevice) {
        await catalogService.updateAdminDevice(editingDevice.id, {
          name: name.trim(),
          deviceType,
          coverImageUrl: coverImageUrl.trim(),
          description: description.trim() || null,
          isActive,
        });
      } else {
        await catalogService.createAdminDevice({
          name: name.trim(),
          deviceType,
          coverImageUrl: coverImageUrl.trim(),
          description: description.trim() || undefined,
          isActive,
        });
      }

      // Sync DeviceType once here in one place
      const matchedType = findMatchingDeviceType(
        deviceTypes,
        editingDevice?.deviceTypeId,
        deviceType
      );
      if (matchedType) {
        if (matchedType.extraControllerEnabled !== deviceExtraControllerEnabled) {
          await catalogService.updateAdminDeviceType(matchedType.id, {
            extraControllerEnabled: deviceExtraControllerEnabled,
          });
        }
      } else {
        await catalogService.createAdminDeviceType({
          name: SHORT_PLATFORM_LABELS[String(deviceType)] ?? String(deviceType),
          category: deviceType,
          extraControllerEnabled: deviceExtraControllerEnabled,
          isActive: true,
        });
      }

      setIsDeviceModalOpen(false);
      setEditingDevice(null);
      reloadDevices();
      setDeviceTypesReload((v) => v + 1);
    } catch (err) {
      setDeviceFormError(getErrorMessage(err));
    } finally {
      setSavingDevice(false);
    }
  };

  const handleToggleDeviceActive = async (device: DeviceCatalogItem) => {
    if (togglingDeviceId) return;
    setTogglingDeviceId(device.id);
    try {
      await catalogService.updateAdminDevice(device.id, {
        isActive: !device.isActive,
      });
      reloadDevices();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setTogglingDeviceId(null);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm("آیا از حذف این دستگاه از کاتالوگ اطمینان دارید؟")) return;
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
    if (!gameCoverUrl.trim()) {
      setGameFormError("انتخاب تصویر بازی الزامی است.");
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
          coverImageUrl: gameCoverUrl.trim(),
          description: gameDescription.trim() || null,
          isActive: gameIsActive,
        });
      } else {
        await catalogService.createAdminGame({
          title: gameTitle.trim(),
          supportedPlatforms: gamePlatforms,
          genre: gameGenre.trim() || undefined,
          coverImageUrl: gameCoverUrl.trim(),
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

  const handleToggleGameActive = async (game: GameCatalogItem) => {
    if (togglingGameId) return;
    setTogglingGameId(game.id);
    try {
      await catalogService.updateAdminGame(game.id, {
        isActive: !game.isActive,
      });
      reloadGames();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setTogglingGameId(null);
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm("آیا از حذف این بازی از کاتالوگ اطمینان دارید؟")) return;
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
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <AdminBreadcrumbs
              items={[{ label: "داشبورد", href: "/admin" }, { label: "کاتالوگ پلتفرم" }]}
            />
            <h1 className="text-xl font-bold text-[var(--text-white)] mt-1">
              کاتالوگ پلتفرم
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              مدیریت یکپارچه دستگاه‌ها (همراه با تعریف تایپ دستگاه) و بازی‌های کاتالوگ
            </p>
          </div>
          <Button
            variant="primary"
            onClick={activeTab === "devices" ? openCreateDeviceModal : openCreateGameModal}
            className="flex items-center gap-2 shrink-0"
          >
            <Icon name="plus" size={18} />
            <span>{activeTab === "devices" ? "افزودن دستگاه" : "افزودن بازی"}</span>
          </Button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="بخش‌های کاتالوگ"
          className="inline-flex w-fit gap-1 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-1"
        >
          {(
            [
              ["devices", `دستگاه‌ها${devices ? ` (${devices.length})` : ""}`],
              ["games", `بازی‌ها${games ? ` (${games.length})` : ""}`],
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
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="relative flex-1 min-w-[220px]">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                  <Icon name="search" size={16} />
                </span>
                <input
                  type="text"
                  placeholder="جستجوی دستگاه..."
                  value={deviceSearchQuery}
                  onChange={(e) => {
                    setDevicesLoading(true);
                    setDeviceSearchQuery(e.target.value);
                  }}
                  className="w-full h-10 pr-9 pl-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <select
                value={selectedFilterType}
                onChange={(e) => {
                  setDevicesLoading(true);
                  setSelectedFilterType(e.target.value);
                }}
                aria-label="فیلتر نوع دستگاه"
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none cursor-pointer"
              >
                <option value="ALL">همه تایپ‌ها</option>
                {DEVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Devices Grid */}
            {devicesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-card bg-[var(--bg-card)] animate-pulse" />
                ))}
              </div>
            )}

            {devicesError && (
              <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)]">
                {devicesError}
              </div>
            )}

            {!devicesLoading && devices && devices.length === 0 && (
              <div className="p-10 text-center rounded-card bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                دستگاهی یافت نشد. با دکمه «افزودن دستگاه» اولین مورد را ثبت کنید.
              </div>
            )}

            {!devicesLoading && devices && devices.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((device) => {
                  const matchedType = findMatchingDeviceType(
                    deviceTypes,
                    device.deviceTypeId,
                    device.deviceType
                  );
                  const extraEnabled = Boolean(
                    device.deviceTypeRef?.extraControllerEnabled ??
                      matchedType?.extraControllerEnabled
                  );

                  return (
                    <div
                      key={device.id}
                      className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3 hover:border-[var(--primary)]/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] overflow-hidden">
                          <SafeImage
                            src={device.coverImageUrl || ""}
                            alt={device.name}
                            fallbackSrc={PLACEHOLDERS.center}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-[var(--text-white)] truncate">
                            {device.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold">
                              {SHORT_PLATFORM_LABELS[String(device.deviceType)] ?? device.deviceType}
                            </span>
                            {extraEnabled && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-green)]/15 text-[var(--accent-green)] font-bold">
                                دسته اضافی
                              </span>
                            )}
                          </div>
                          {device.description && (
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1.5">
                              {device.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <CardIconActions
                        isActive={device.isActive}
                        isToggling={togglingDeviceId === device.id}
                        onToggleActive={() => handleToggleDeviceActive(device)}
                        onEdit={() => openEditDeviceModal(device)}
                        onDelete={() => handleDeleteDevice(device.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Game Filters */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="relative flex-1 min-w-[220px]">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
                  <Icon name="search" size={16} />
                </span>
                <input
                  type="text"
                  placeholder="جستجوی بازی..."
                  value={gameSearchQuery}
                  onChange={(e) => {
                    setGamesLoading(true);
                    setGameSearchQuery(e.target.value);
                  }}
                  className="w-full h-10 pr-9 pl-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <select
                value={selectedGamePlatform}
                onChange={(e) => {
                  setGamesLoading(true);
                  setSelectedGamePlatform(e.target.value);
                }}
                aria-label="فیلتر پلتفرم"
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

            {/* Games Grid */}
            {gamesLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 rounded-card bg-[var(--bg-card)] animate-pulse" />
                ))}
              </div>
            )}

            {gamesError && (
              <div className="p-4 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)]">
                {gamesError}
              </div>
            )}

            {!gamesLoading && games && games.length === 0 && (
              <div className="p-10 text-center rounded-card bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                بازی‌ای یافت نشد. با دکمه «افزودن بازی» اولین مورد را ثبت کنید.
              </div>
            )}

            {!gamesLoading && games && games.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3 hover:border-[var(--primary)]/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-20 shrink-0 rounded-card bg-[var(--foreground)]/50 border border-[var(--border-subtle)] overflow-hidden">
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

                    <CardIconActions
                      isActive={game.isActive}
                      isToggling={togglingGameId === game.id}
                      onToggleActive={() => handleToggleGameActive(game)}
                      onEdit={() => openEditGameModal(game)}
                      onDelete={() => handleDeleteGame(game.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: افزودن / ویرایش دستگاه + تعریف تایپ دستگاه */}
      <Modal
        isOpen={isDeviceModalOpen}
        onClose={() => {
          if (!savingDevice) setIsDeviceModalOpen(false);
        }}
        title={editingDevice ? "ویرایش دستگاه" : "افزودن دستگاه جدید"}
      >
        <form onSubmit={handleDeviceSubmit} className="flex flex-col gap-4">
          {deviceFormError && (
            <p className="text-xs font-bold text-[var(--accent-red)]">{deviceFormError}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)]">
              نام دستگاه <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              type="text"
              placeholder="مثلاً PlayStation 5 Slim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)]">
              تایپ دستگاه (Device Type)
            </label>
            <select
              value={deviceType}
              onChange={(e) => handleDeviceTypeChangeInModal(e.target.value as DeviceType)}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none cursor-pointer"
            >
              {DEVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <CatalogImagePicker
            label="تصویر دستگاه"
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)]">توضیحات (اختیاری)</label>
            <textarea
              rows={2}
              placeholder="مشخصات کوتاه..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <label className="flex items-center gap-2.5 text-xs text-[var(--text-white)] cursor-pointer">
              <input
                type="checkbox"
                checked={deviceExtraControllerEnabled}
                onChange={(e) => setDeviceExtraControllerEnabled(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
              />
              <span className="font-bold">قابلیت داشتن دسته اضافی برای این تایپ دستگاه</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-[var(--text-white)] cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
              />
              <span>فعال در کاتالوگ</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              variant="secondary"
              onClick={() => setIsDeviceModalOpen(false)}
              disabled={savingDevice}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={savingDevice}>
              {editingDevice ? "ذخیره تغییرات" : "ثبت دستگاه"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: افزودن / ویرایش بازی */}
      <Modal
        isOpen={isGameModalOpen}
        onClose={() => {
          if (!savingGame) setIsGameModalOpen(false);
        }}
        title={editingGame ? "ویرایش بازی" : "افزودن بازی جدید"}
      >
        <form onSubmit={handleGameSubmit} className="flex flex-col gap-4">
          {gameFormError && (
            <p className="text-xs font-bold text-[var(--accent-red)]">{gameFormError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">
                نام بازی <span className="text-[var(--accent-red)]">*</span>
              </label>
              <input
                type="text"
                placeholder="مثلاً FC 25"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)]">ژانر (اختیاری)</label>
              <input
                type="text"
                placeholder="مثلاً ورزشی / اکشن"
                value={gameGenre}
                onChange={(e) => setGameGenre(e.target.value)}
                className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)]">
              پلتفرم‌های پشتیبانی‌شده <span className="text-[var(--accent-red)]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DEVICE_TYPES.map((t) => {
                const selected = gamePlatforms.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleGamePlatform(t.value)}
                    className={`h-8 px-3 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                      selected
                        ? "bg-[var(--primary)] text-black border-[var(--primary)]"
                        : "bg-[var(--foreground)]/30 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-white)]"
                    }`}
                  >
                    {SHORT_PLATFORM_LABELS[t.value] ?? t.value}
                  </button>
                );
              })}
            </div>
          </div>

          <CatalogImagePicker
            label="تصویر بازی"
            value={gameCoverUrl}
            onChange={setGameCoverUrl}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)]">توضیحات (اختیاری)</label>
            <textarea
              rows={2}
              placeholder="توضیحات کوتاه..."
              value={gameDescription}
              onChange={(e) => setGameDescription(e.target.value)}
              className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-none"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs text-[var(--text-white)] cursor-pointer">
            <input
              type="checkbox"
              checked={gameIsActive}
              onChange={(e) => setGameIsActive(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
            />
            <span>فعال در کاتالوگ</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button
              variant="secondary"
              onClick={() => setIsGameModalOpen(false)}
              disabled={savingGame}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={savingGame}>
              {editingGame ? "ذخیره تغییرات" : "ثبت بازی"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminPageContainer>
  );
}
