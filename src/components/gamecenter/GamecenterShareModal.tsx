"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { isAbortError } from "@/lib/api/client";
import {
  shortLinkService,
  type GamecenterShareData,
} from "@/services/shortLinkService";

interface GamecenterShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gamingCenterId: string;
  gamingCenterSlug: string;
  gamingCenterName: string;
  existingShortUrl?: string | null;
  isAuthenticated?: boolean;
}

export const GamecenterShareModal: React.FC<GamecenterShareModalProps> = ({
  isOpen,
  onClose,
  gamingCenterId,
  gamingCenterSlug,
  gamingCenterName,
  existingShortUrl,
  isAuthenticated = false,
}) => {
  const [shareData, setShareData] = useState<GamecenterShareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const destinationUrl = useMemo(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/gamecenter/${encodeURIComponent(gamingCenterSlug)}`;
    }
    return `https://sayragame.ir/gamecenter/${encodeURIComponent(gamingCenterSlug)}`;
  }, [gamingCenterSlug]);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setIsLoading(true);

    shortLinkService
      .resolveGamecenterShare({
        gamingCenterId,
        gamingCenterName,
        destinationUrl,
        isAuthenticated,
        existingShortUrl,
        signal: controller.signal,
      })
      .then((data) => {
        if (active) {
          setShareData(data);
        }
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setShareData({
          shortUrl: destinationUrl,
          isShortened: false,
          qrSvg: null,
          qrDataUrl: null,
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    isOpen,
    gamingCenterId,
    gamingCenterName,
    destinationUrl,
    isAuthenticated,
    existingShortUrl,
  ]);

  const displayUrl = shareData?.shortUrl || destinationUrl;

  const qrImageSrc = useMemo(() => {
    if (!shareData) return null;
    if (shareData.qrDataUrl) return shareData.qrDataUrl;
    if (shareData.qrSvg) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(shareData.qrSvg)}`;
    }
    return null;
  }, [shareData]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy via temporary input
      try {
        const input = document.createElement("input");
        input.value = displayUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        // Ignore clipboard failure
      }
    }
  }, [displayUrl]);

  const handleDownloadQr = useCallback(() => {
    if (!shareData) return;

    const safeSlug = gamingCenterSlug.replace(/[^a-zA-Z0-9_-]/g, "") || "gamecenter";

    if (shareData.qrSvg) {
      const blob = new Blob([shareData.qrSvg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sayra-${safeSlug}-qr.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (shareData.qrDataUrl) {
      const link = document.createElement("a");
      link.href = shareData.qrDataUrl;
      link.download = `sayra-${safeSlug}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [shareData, gamingCenterSlug]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return;
    }
    try {
      await navigator.share({
        title: gamingCenterName,
        text: `مشاهده و رزرو آنلاین ${gamingCenterName} در سایرا`,
        url: displayUrl,
      });
    } catch {
      // User cancelled share sheet
    }
  }, [displayUrl, gamingCenterName]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="اشتراک‌گذاری گیمنت"
      className="max-w-[420px]"
    >
      <div className="flex flex-col gap-5" dir="rtl">
        {/* Header description */}
        <div className="flex flex-col gap-1 text-center">
          <p className="text-sm font-bold text-[var(--text-white)] truncate">
            {gamingCenterName}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            برای اشتراک‌گذاری، QR کد را اسکن کنید یا لینک زیر را کپی نمایید.
          </p>
        </div>

        {/* QR Code showcase */}
        <div className="flex flex-col items-center justify-center rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/25 p-5 gap-3">
          {isLoading ? (
            <Skeleton className="h-52 w-52 rounded-card" />
          ) : qrImageSrc ? (
            <div className="rounded-card bg-white p-3 shadow-lg ring-1 ring-white/10">
              <img
                src={qrImageSrc}
                alt={`QR کد ${gamingCenterName}`}
                className="h-44 w-44 object-contain block"
              />
            </div>
          ) : (
            <div className="flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-[var(--border-color)] text-xs text-[var(--text-muted)]">
              <Icon name="alert" size={20} />
              <span>امکان ساخت QR کد نبود</span>
            </div>
          )}

          {!isLoading && qrImageSrc && (
            <button
              type="button"
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline transition-colors cursor-pointer"
            >
              <Icon name="upload" size={14} className="rotate-180" />
              <span>دانلود QR کد</span>
            </button>
          )}
        </div>

        {/* Short Link Box */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-[var(--text-muted)]">
            {shareData?.isShortened ? "لینک کوتاه گیمنت" : "لینک صفحه گیمنت"}
          </span>

          <div className="flex items-center gap-2 rounded-card border border-[var(--border-color)] bg-[var(--bg-body)] p-1.5 pr-3">
            {isLoading ? (
              <Skeleton className="h-5 flex-1 rounded-child" />
            ) : (
              <span
                dir="ltr"
                className="flex-1 min-w-0 truncate text-left font-mono text-xs text-[var(--text-white)] select-all"
                title={displayUrl}
              >
                {displayUrl}
              </span>
            )}

            <Button
              type="button"
              variant={copied ? "secondary" : "primary"}
              size="sm"
              disabled={isLoading}
              onClick={handleCopy}
              className="shrink-0 h-9 px-3 gap-1.5"
            >
              <Icon name={copied ? "check" : "copy"} size={15} />
              <span>{copied ? "کپی شد" : "کپی"}</span>
            </Button>
          </div>
        </div>

        {/* Optional native share button */}
        {canNativeShare && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={isLoading}
            onClick={handleNativeShare}
            className="w-full gap-2"
          >
            <Icon name="share" size={16} />
            <span>اشتراک‌گذاری در برنامه‌ها</span>
          </Button>
        )}
      </div>
    </Modal>
  );
};
