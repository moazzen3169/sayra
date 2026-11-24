"use client";

import { useMemo } from "react";
import { generateQrSvg } from "@/lib/qrCode";

export interface QrCodeDisplayProps {
  qrCodeDataUrl?: string;
  qrCodeSvg?: string;
  otpauthUrl?: string;
  alt?: string;
  size?: number;
}

/**
 * Renders a TOTP QR code safely via <img> (never dangerouslySetInnerHTML).
 * Priority:
 * 1. Backend-provided qrCodeDataUrl
 * 2. Backend-provided qrCodeSvg encoded as data:image/svg+xml
 * 3. Client-side ISO/IEC 18004 QR SVG fallback from otpauthUrl
 */
export function QrCodeDisplay({
  qrCodeDataUrl,
  qrCodeSvg,
  otpauthUrl,
  alt = "کد QR احراز هویت دومرحله‌ای",
  size = 200,
}: QrCodeDisplayProps) {
  const src = useMemo(() => {
    if (qrCodeDataUrl && qrCodeDataUrl.startsWith("data:image/")) {
      return qrCodeDataUrl;
    }

    if (qrCodeSvg && qrCodeSvg.trim().startsWith("<svg")) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCodeSvg)}`;
    }

    if (otpauthUrl) {
      try {
        const svg = generateQrSvg(otpauthUrl, {
          margin: 2,
          foreground: "#0f172a",
          background: "#ffffff",
        });
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      } catch {
        return null;
      }
    }

    return null;
  }, [qrCodeDataUrl, qrCodeSvg, otpauthUrl]);

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center text-xs text-slate-400"
      >
        نمایش QR Code ممکن نشد؛ لطفاً از کلید دستی استفاده کنید.
      </div>
    );
  }

  return (
    <div className="inline-flex rounded-2xl bg-white p-3 shadow-md ring-1 ring-slate-200/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="block rounded-lg"
      />
    </div>
  );
}
