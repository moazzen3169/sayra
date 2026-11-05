"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { normalizeMediaUrl, resolveMediaUrl, PLACEHOLDERS } from "@/lib/media";

export interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** The primary image source (absolute, relative, or nullable) */
  src?: string | Blob | null;
  /** Optional thumbnail source used if preferThumbnail is true or as intermediate */
  thumbSrc?: string | null;
  /** Whether to prefer thumbSrc over src */
  preferThumbnail?: boolean;
  /** Fallback image URL when primary loading fails or src is empty */
  fallbackSrc?: string;
  /** Alternative text */
  alt?: string;
  /** Optional custom CSS classes */
  className?: string;
  /** Additional onError callback */
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  /** Whether to enable native lazy loading (default: lazy) */
  loading?: "lazy" | "eager";
  /** Sizing and object fit behavior helper */
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

/**
 * Robust image component for all dynamic and user-uploaded media.
 * - Resolves relative backend paths and prevents duplicate /uploads/
 * - Handles nullable / undefined / empty URLs gracefully
 * - Falls back to context-appropriate placeholder on 404 or network errors
 * - Guards against infinite error loops if the fallback fails
 * - Resets error state whenever the `src` changes dynamically
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  thumbSrc,
  preferThumbnail = false,
  fallbackSrc = PLACEHOLDERS.center,
  alt = "",
  className = "",
  onError,
  loading = "lazy",
  objectFit,
  style,
  ...rest
}) => {
  // Determine primary resolved URL
  const primaryResolved = useMemo(() => {
    const stringSrc = typeof src === "string" ? src : undefined;
    return resolveMediaUrl(
      {
        url: stringSrc,
        thumbUrl: thumbSrc,
      },
      preferThumbnail
    );
  }, [src, thumbSrc, preferThumbnail]);

  const resolvedFallback = useMemo(() => {
    return normalizeMediaUrl(fallbackSrc) || PLACEHOLDERS.center;
  }, [fallbackSrc]);

  // Track failure states
  // 0: Initial attempt (primary or thumbnail)
  // 1: Primary failed -> tried fallback
  // 2: Fallback failed -> stop to prevent infinite loop
  const [hasPrimaryError, setHasPrimaryError] = useState(false);
  const [hasFallbackError, setHasFallbackError] = useState(false);

  // Reset error states whenever the input src or thumbSrc changes
  useEffect(() => {
    setHasPrimaryError(false);
    setHasFallbackError(false);
  }, [src, thumbSrc, fallbackSrc]);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!hasPrimaryError) {
        // First error on primary image
        setHasPrimaryError(true);
      } else {
        // Fallback itself failed; do not trigger another change to prevent infinite loops
        setHasFallbackError(true);
      }

      if (onError) {
        onError(e);
      }
    },
    [hasPrimaryError, onError]
  );

  // Decide which source to display
  let currentSrc: string;
  if (hasFallbackError) {
    // If even fallback image fails, use inline transparent 1x1 GIF to prevent browser broken icon loop
    currentSrc = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  } else if (hasPrimaryError || !primaryResolved) {
    currentSrc = resolvedFallback;
  } else {
    currentSrc = primaryResolved;
  }

  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(objectFit ? { objectFit } : {}),
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={handleError}
      className={className}
      style={combinedStyle}
      {...rest}
    />
  );
};
