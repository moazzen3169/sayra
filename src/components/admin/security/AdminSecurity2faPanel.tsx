"use client";

import React, { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { QrCodeDisplay } from "@/components/admin/security/QrCodeDisplay";
import { RecoveryCodesPanel } from "@/components/admin/security/RecoveryCodesPanel";
import { toEnglishDigits, toPersianDigits } from "@/lib/format";
import { clearAdminTokens } from "@/lib/token";
import {
  authService,
  type PlatformAdmin2faSetupResponse,
  type PlatformAdmin2faStatusResponse,
  type PlatformAdminSessionItem,
} from "@/services/authService";

type ActiveModal =
  | null
  | { type: "add-device" }
  | { type: "delete-device"; deviceId: string; deviceLabel: string }
  | { type: "regenerate-recovery" }
  | { type: "disable-2fa" };

function formatDateTimeFa(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminSecurity2faPanel() {
  const router = useRouter();

  const [status, setStatus] = useState<PlatformAdmin2faStatusResponse | null>(
    null
  );
  const [sessions, setSessions] = useState<PlatformAdminSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal / sub-flow state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthCode, setReauthCode] = useState("");
  const [disableRecoveryCode, setDisableRecoveryCode] = useState("");
  const [disableUseRecovery, setDisableUseRecovery] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Pending new device setup
  const [pendingDeviceSetup, setPendingDeviceSetup] =
    useState<PlatformAdmin2faSetupResponse | null>(null);
  const [newDeviceConfirmCode, setNewDeviceConfirmCode] = useState("");

  // Newly generated recovery codes (shown once)
  const [freshRecoveryCodes, setFreshRecoveryCodes] = useState<string[] | null>(
    null
  );

  const fetchSecurityData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [twoFaStatus, activeSessions] = await Promise.all([
        authService.getPlatformAdmin2faStatus(),
        authService.getPlatformAdminSessions(),
      ]);
      setStatus(twoFaStatus);
      setSessions(activeSessions);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "خطا در دریافت وضعیت امنیت و نشست‌های ادمین.";
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [twoFaStatus, activeSessions] = await Promise.all([
          authService.getPlatformAdmin2faStatus(),
          authService.getPlatformAdminSessions(),
        ]);
        if (cancelled) return;
        setStatus(twoFaStatus);
        setSessions(activeSessions);
      } catch (error: unknown) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "خطا در دریافت وضعیت امنیت و نشست‌های ادمین.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const closeModal = () => {
    setActiveModal(null);
    setReauthPassword("");
    setReauthCode("");
    setDisableRecoveryCode("");
    setDisableUseRecovery(false);
    setDeviceLabel("");
    setPendingDeviceSetup(null);
    setNewDeviceConfirmCode("");
    setActionError(null);
  };

  // Start adding a new authenticator device
  const handleStartAddDevice = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setActionError(null);

    const cleanCode = toEnglishDigits(reauthCode).replace(/\D/g, "");
    if (!reauthPassword || cleanCode.length !== 6) {
      setActionError("لطفاً رمز عبور فعلی و کد ۶ رقمی TOTP فعلی را وارد کنید.");
      return;
    }

    setIsSubmitting(true);
    try {
      const setup = await authService.setupPlatformAdmin2fa({
        currentPassword: reauthPassword,
        currentTotpCode: cleanCode,
        label: deviceLabel.trim() || undefined,
        mode: "ADD",
      });
      setPendingDeviceSetup(setup);
      setNewDeviceConfirmCode("");
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "خطا در ایجاد دستگاه جدید."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm new authenticator device
  const handleConfirmAddDevice = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !pendingDeviceSetup) return;
    setActionError(null);

    const cleanCode = toEnglishDigits(newDeviceConfirmCode).replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setActionError("لطفاً کد ۶ رقمی دستگاه جدید را وارد کنید.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.confirmPlatformAdmin2fa({
        deviceId: pendingDeviceSetup.deviceId,
        code: cleanCode,
        mode: "ADD",
      });
      closeModal();
      setActionMessage("دستگاه Authenticator جدید با موفقیت اضافه و فعال شد.");
      await fetchSecurityData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "تأیید کد دستگاه جدید ناموفق بود."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete secondary device
  const handleDeleteDevice = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || activeModal?.type !== "delete-device") return;
    setActionError(null);

    const cleanCode = toEnglishDigits(reauthCode).replace(/\D/g, "");
    if (!reauthPassword || cleanCode.length !== 6) {
      setActionError("برای حذف دستگاه، رمز عبور و کد ۶ رقمی TOTP الزامی است.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.deletePlatformAdmin2faDevice(activeModal.deviceId, {
        currentPassword: reauthPassword,
        code: cleanCode,
      });
      closeModal();
      setActionMessage("دستگاه Authenticator با موفقیت حذف شد.");
      await fetchSecurityData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error ? error.message : "حذف دستگاه با خطا مواجه شد."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Regenerate recovery codes
  const handleRegenerateRecovery = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setActionError(null);

    const cleanCode = toEnglishDigits(reauthCode).replace(/\D/g, "");
    if (!reauthPassword || cleanCode.length !== 6) {
      setActionError("لطفاً رمز عبور فعلی و کد ۶ رقمی TOTP را وارد کنید.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.regeneratePlatformAdminRecoveryCodes({
        currentPassword: reauthPassword,
        code: cleanCode,
      });
      closeModal();
      setFreshRecoveryCodes(res.recoveryCodes);
      setActionMessage(
        "کدهای بازیابی جدید صادر و کدهای قبلی باطل شدند. لطفاً آن‌ها را ذخیره کنید."
      );
      await fetchSecurityData();
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "تولید مجدد کدهای بازیابی ناموفق بود."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disable 2FA (revokes all sessions and requires setup on next login)
  const handleDisable2fa = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setActionError(null);

    if (!reauthPassword) {
      setActionError("وارد کردن رمز عبور فعلی الزامی است.");
      return;
    }

    const cleanCode = toEnglishDigits(reauthCode).replace(/\D/g, "");
    const cleanRecovery = toEnglishDigits(disableRecoveryCode).trim();

    if (!disableUseRecovery && cleanCode.length !== 6) {
      setActionError("لطفاً کد ۶ رقمی TOTP را وارد کنید.");
      return;
    }

    if (disableUseRecovery && !cleanRecovery) {
      setActionError("لطفاً کد بازیابی یکبارمصرف را وارد کنید.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.disablePlatformAdmin2fa({
        currentPassword: reauthPassword,
        ...(disableUseRecovery
          ? { recoveryCode: cleanRecovery }
          : { code: cleanCode }),
      });
      clearAdminTokens();
      router.replace("/admin/login");
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "غیرفعال‌سازی 2FA با خطا مواجه شد."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revoke all active admin sessions
  const handleRevokeAllSessions = async () => {
    if (isRevokingAll) return;
    setIsRevokingAll(true);
    setActionError(null);
    try {
      await authService.revokeAllPlatformAdminSessions();
      clearAdminTokens();
      router.replace("/admin/login");
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "لغو نشست‌های فعال با خطا مواجه شد."
      );
    } finally {
      setIsRevokingAll(false);
    }
  };

  const activeDevices = (status?.devices ?? []).filter(
    (d) => d.status === "ACTIVE"
  );

  return (
    <div className="bg-card-bg border border-border rounded-card p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-white">
              احراز هویت دومرحله‌ای (2FA) و نشست‌های ادمین
            </h2>
            {status?.totpEnabled && (
              <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)] font-bold">
                2FA فعال
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            مدیریت دستگاه‌های Authenticator، کدهای بازیابی یکبارمصرف و نشست‌های فعال پنل مدیریت
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={fetchSecurityData}
          disabled={isLoading}
        >
          بروزرسانی
        </Button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-card bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-xs text-[var(--accent-green)] flex items-center justify-between gap-2">
          <span>{actionMessage}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-[var(--accent-green)]/20 rounded"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {actionError && !activeModal && (
        <div className="p-3.5 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-xs text-[var(--accent-red)] flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 hover:bg-[var(--accent-red)]/20 rounded"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Freshly Regenerated Recovery Codes (one-time display) */}
      {freshRecoveryCodes && freshRecoveryCodes.length > 0 && (
        <div className="p-4 rounded-card border border-amber-500/30 bg-slate-900/80 space-y-3">
          <RecoveryCodesPanel codes={freshRecoveryCodes} />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFreshRecoveryCodes(null)}
            >
              ذخیره کردم، بستن این بخش
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-10 flex flex-col items-center justify-center gap-2 text-text-muted text-xs">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>در حال دریافت وضعیت امنیت حساب ادمین...</span>
        </div>
      ) : loadError ? (
        <div className="p-4 rounded-card bg-foreground/20 border border-border text-xs text-text-muted flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <Button type="button" variant="secondary" size="sm" onClick={fetchSecurityData}>
            تلاش مجدد
          </Button>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-card bg-foreground/20 border border-border">
              <span className="text-xs text-text-muted block">وضعیت TOTP</span>
              <span className="text-sm font-bold text-text-white mt-1 block">
                {status?.totpEnabled ? "فعال و تاییدشده" : "غیرفعال"}
              </span>
              <span className="text-[11px] text-text-subtle mt-1 block">
                فعال‌سازی: {formatDateTimeFa(status?.totpEnabledAt)}
              </span>
            </div>

            <div className="p-4 rounded-card bg-foreground/20 border border-border">
              <span className="text-xs text-text-muted block">
                کدهای بازیابی باقی‌مانده
              </span>
              <span className="text-sm font-bold text-text-white mt-1 block">
                {toPersianDigits(status?.recoveryCodesRemaining ?? 0)} کد
              </span>
              <span className="text-[11px] text-text-subtle mt-1 block">
                آخرین استفاده 2FA: {formatDateTimeFa(status?.totpLastUsedAt)}
              </span>
            </div>

            <div className="p-4 rounded-card bg-foreground/20 border border-border">
              <span className="text-xs text-text-muted block">نشست‌های فعال</span>
              <span className="text-sm font-bold text-text-white mt-1 block">
                {toPersianDigits(
                  status?.activeSessionsCount ?? sessions.length
                )}{" "}
                نشست
              </span>
              <span className="text-[11px] text-text-subtle mt-1 block">
                دستگاه‌های متصل: {toPersianDigits(activeDevices.length)}
              </span>
            </div>
          </div>

          {/* Connected Authenticator Devices */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-text-white">
                دستگاه‌های Authenticator متصل
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    closeModal();
                    setActiveModal({ type: "add-device" });
                  }}
                >
                  افزودن دستگاه جدید
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    closeModal();
                    setActiveModal({ type: "regenerate-recovery" });
                  }}
                >
                  تولید مجدد کدهای بازیابی
                </Button>
              </div>
            </div>

            {activeDevices.length === 0 ? (
              <p className="text-xs text-text-muted">
                هیچ دستگاه فعالی ثبت نشده است.
              </p>
            ) : (
              <div className="space-y-2">
                {activeDevices.map((device) => (
                  <div
                    key={device.id}
                    className="p-3.5 rounded-card bg-foreground/20 border border-border flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-white">
                          {device.label || "Authenticator"}
                        </span>
                        {device.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">
                            اصلی
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-subtle">
                        تاییدشده: {formatDateTimeFa(device.verifiedAt)} • آخرین استفاده:{" "}
                        {formatDateTimeFa(device.lastUsedAt)}
                      </p>
                    </div>

                    {activeDevices.length > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          closeModal();
                          setActiveModal({
                            type: "delete-device",
                            deviceId: device.id,
                            deviceLabel: device.label || "Authenticator",
                          });
                        }}
                      >
                        حذف دستگاه
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-text-white">
                نشست‌های فعال پنل ادمین
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRevokeAllSessions}
                isLoading={isRevokingAll}
              >
                لغو تمام نشست‌های فعال
              </Button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-xs text-text-muted">
                نشست فعالی یافت نشد.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-card bg-foreground/20 border border-border flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-text-white" dir="ltr">
                          {session.ipAddress || "IP نامشخص"}
                        </span>
                        {session.isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)] font-semibold">
                            نشست فعلی
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-subtle truncate max-w-xl" dir="ltr">
                        {session.userAgent || "مرورگر نامشخص"}
                      </p>
                    </div>
                    <div className="text-[11px] text-text-muted text-left">
                      <div>آخرین فعالیت: {formatDateTimeFa(session.lastUsedAt)}</div>
                      <div>انقضا: {formatDateTimeFa(session.expiresAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone: Disable 2FA */}
          {status?.totpEnabled && (
            <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--accent-red)]">
                  غیرفعال‌سازی احراز هویت دومرحله‌ای
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  با غیرفعال‌سازی 2FA تمام نشست‌های فعال لغو می‌شوند و در ورود بعدی راه‌اندازی مجدد اجباری خواهد بود.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  closeModal();
                  setActiveModal({ type: "disable-2fa" });
                }}
              >
                غیرفعال‌سازی 2FA
              </Button>
            </div>
          )}
        </>
      )}

      {/* Re-auth / Add Device / Delete Device / Regenerate / Disable Inline Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {activeModal.type === "add-device" &&
                  (pendingDeviceSetup
                    ? "اسکن QR و تأیید دستگاه جدید"
                    : "افزودن دستگاه Authenticator جدید")}
                {activeModal.type === "delete-device" &&
                  `حذف دستگاه «${activeModal.deviceLabel}»`}
                {activeModal.type === "regenerate-recovery" &&
                  "تولید مجدد کدهای بازیابی"}
                {activeModal.type === "disable-2fa" &&
                  "غیرفعال‌سازی احراز هویت دومرحله‌ای"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-white"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Add Device Step 2: QR + Confirm */}
            {activeModal.type === "add-device" && pendingDeviceSetup ? (
              <form onSubmit={handleConfirmAddDevice} className="space-y-4">
                <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <QrCodeDisplay
                    qrCodeDataUrl={pendingDeviceSetup.qrCodeDataUrl}
                    qrCodeSvg={pendingDeviceSetup.qrCodeSvg}
                    otpauthUrl={pendingDeviceSetup.otpauthUrl}
                    size={180}
                  />
                  <code
                    dir="ltr"
                    className="text-xs font-mono text-slate-300 select-all"
                  >
                    {pendingDeviceSetup.manualEntryKey ||
                      pendingDeviceSetup.secret}
                  </code>
                </div>

                <Input
                  label="کد ۶ رقمی دستگاه جدید"
                  placeholder="123456"
                  dir="ltr"
                  maxLength={6}
                  value={newDeviceConfirmCode}
                  onChange={(e) =>
                    setNewDeviceConfirmCode(
                      toEnglishDigits(e.target.value)
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                />

                {actionError && (
                  <p className="text-xs text-red-400">{actionError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={closeModal}
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmitting}
                  >
                    تأیید و فعال‌سازی
                  </Button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={
                  activeModal.type === "add-device"
                    ? handleStartAddDevice
                    : activeModal.type === "delete-device"
                      ? handleDeleteDevice
                      : activeModal.type === "regenerate-recovery"
                        ? handleRegenerateRecovery
                        : handleDisable2fa
                }
                className="space-y-4"
              >
                {activeModal.type === "add-device" && (
                  <Input
                    label="نام دستگاه (اختیاری)"
                    placeholder="مثلاً Google Authenticator - موبایل کاری"
                    value={deviceLabel}
                    onChange={(e) => setDeviceLabel(e.target.value)}
                  />
                )}

                <Input
                  label="رمز عبور فعلی ادمین *"
                  type="password"
                  placeholder="رمز عبور خود را وارد کنید"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                />

                {activeModal.type === "disable-2fa" && (
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disableUseRecovery}
                      onChange={(e) => setDisableUseRecovery(e.target.checked)}
                    />
                    <span>استفاده از کد بازیابی یکبارمصرف به‌جای کد TOTP</span>
                  </label>
                )}

                {activeModal.type === "disable-2fa" && disableUseRecovery ? (
                  <Input
                    label="کد بازیابی یکبارمصرف *"
                    placeholder="A1B2-C3D4-E5F6-0718"
                    dir="ltr"
                    value={disableRecoveryCode}
                    onChange={(e) =>
                      setDisableRecoveryCode(
                        toEnglishDigits(e.target.value).toUpperCase()
                      )
                    }
                  />
                ) : (
                  <Input
                    label="کد ۶ رقمی TOTP فعلی *"
                    placeholder="123456"
                    dir="ltr"
                    maxLength={6}
                    value={reauthCode}
                    onChange={(e) =>
                      setReauthCode(
                        toEnglishDigits(e.target.value)
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                  />
                )}

                {actionError && (
                  <p className="text-xs text-red-400">{actionError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={closeModal}
                  >
                    انصراف
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmitting}
                  >
                    تأیید و ادامه
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
