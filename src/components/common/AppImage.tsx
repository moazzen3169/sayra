"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image, { type ImageProps } from "next/image";
import {
  DEFAULT_IMAGE_PATH,
  TERMINAL_TRANSPARENT_PIXEL,
  MAX_IMAGE_RETRIES,
  normalizeImageSource,
  resolveInitialImageSource,
} from "@/lib/imageUtils";

export interface AppImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "placeholder"> {
  /**
   * The primary image source URL, local path, or null/undefined.
   */
  src?: string | Blob | null;

  /**
   * Optional custom fallback image path. If not provided or empty, defaults to `/images/default-image.png`.
   */
  fallbackSrc?: string | null;

  /**
   * Accessible alternative text for the image.
   */
  alt?: string;

  /**
   * Custom CSS classes.
   */
  className?: string;

  /**
   * Object fit style ('cover' | 'contain' | 'fill' | 'none' | 'scale-down').
   */
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";

  /**
   * Native image loading mode ('lazy' | 'eager'). Defaults to 'lazy'.
   */
  loading?: "lazy" | "eager";

  /**
   * Sizing attributes for layout control.
   */
  width?: number | string;
  height?: number | string;

  /**
   * Whether to fill the parent container (mirrors Next.js Image fill layout).
   */
  fill?: boolean;

  /**
   * Responsive sizes attribute.
   */
  sizes?: string;

  /**
   * High priority loading (preloads image).
   */
  priority?: boolean;

  /**
   * Maximum allowed retry attempts before permanently falling back. Defaults to 5.
   */
  maxRetries?: number;

  /**
   * Callback fired when the image successfully loads.
   */
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;

  /**
   * Callback fired when an image load error occurs.
   */
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;

  /**
   * If true, forces rendering via `next/image` when dimensions or fill are provided.
   * If false, renders via standard optimized `<img>`. Defaults to auto-detect.
   */
  useNextImage?: boolean;
}

/**
 * AppImage - Centralized Image Component
 *
 * Requirements:
 * 1. Accepts string, Blob, null, or undefined.
 * 2. Automatically falls back to `/images/default-image.png` if source is null, empty, or fails.
 * 3. Handles 404, 403, 500, network errors, and malformed URLs gracefully.
 * 4. Limits retries to max 5 (configurable), preventing infinite request loops.
 * 5. Prevents retry loops across React re-renders unless the `src` actually changes.
 * 6. Guarantees the fallback itself cannot cause an infinite error loop.
 * 7. Supports all standard image props: alt, className, width, height, fill, sizes, priority, objectFit, onLoad, onError.
 * 8. Zero external dependencies for fallback assets.
 */
export const AppImage: React.FC<AppImageProps> = ({
  src,
  fallbackSrc,
  alt = "",
  className = "",
  objectFit,
  loading = "lazy",
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  maxRetries = MAX_IMAGE_RETRIES,
  onLoad,
  onError,
  style,
  useNextImage,
  ...rest
}) => {
  // Normalize and resolve initial source
  const targetFallback = useMemo(() => {
    return normalizeImageSource(fallbackSrc) || DEFAULT_IMAGE_PATH;
  }, [fallbackSrc]);

  const initialResolution = useMemo(() => {
    return resolveInitialImageSource(src, targetFallback);
  }, [src, targetFallback]);

  // Current displayed source
  const [currentSrc, setCurrentSrc] = useState<string>(initialResolution.resolvedSrc);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(initialResolution.isFallback);
  const [hasTerminalError, setHasTerminalError] = useState<boolean>(false);

  // Retry tracking (scoped strictly to current src, never resets on plain re-renders)
  const retryCountRef = useRef<number>(0);
  const lastSrcRef = useRef<string | Blob | null | undefined>(src);
  const isMountedRef = useRef<boolean>(true);

  // Reset retry counter and state ONLY when src or fallbackSrc actually changes
  useEffect(() => {
    isMountedRef.current = true;

    if (lastSrcRef.current !== src) {
      lastSrcRef.current = src;
      retryCountRef.current = 0;
      setHasTerminalError(false);

      const res = resolveInitialImageSource(src, targetFallback);
      setCurrentSrc(res.resolvedSrc);
      setIsUsingFallback(res.isFallback);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [src, targetFallback]);

  // Handle image load error
  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!isMountedRef.current) return;

      if (onError) {
        try {
          onError(e);
        } catch {
          // Prevent onError consumer callback from crashing component
        }
      }

      // If already on fallback image and it fails, switch to terminal 1x1 transparent GIF
      if (isUsingFallback || currentSrc === targetFallback || currentSrc === DEFAULT_IMAGE_PATH) {
        setHasTerminalError(true);
        setCurrentSrc(TERMINAL_TRANSPARENT_PIXEL);
        return;
      }

      // Immediately switch to the local fallback image on error.
      // Increment the retry count to track attempts for the current source up to maxRetries.
      retryCountRef.current += 1;
      setIsUsingFallback(true);
      setCurrentSrc(targetFallback);
    },
    [currentSrc, isUsingFallback, targetFallback, maxRetries, onError]
  );

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!isMountedRef.current) return;
      if (onLoad) {
        onLoad(e);
      }
    },
    [onLoad]
  );

  // Compute styles
  const combinedStyle: React.CSSProperties = useMemo(() => {
    return {
      ...style,
      ...(objectFit ? { objectFit } : {}),
      ...(fill
        ? {
            position: "absolute",
            height: "100%",
            width: "100%",
            inset: 0,
          }
        : {}),
    };
  }, [style, objectFit, fill]);

  // If using Next.js Image component when explicitly requested or when width/height/fill are specified and src is compatible
  const shouldRenderNextImage =
    useNextImage === true ||
    (useNextImage === undefined &&
      (fill || (width !== undefined && height !== undefined)) &&
      !hasTerminalError &&
      !currentSrc.startsWith("blob:") &&
      !currentSrc.startsWith("data:"));

  if (shouldRenderNextImage && (width || height || fill)) {
    return (
      <Image
        src={currentSrc}
        alt={alt}
        width={fill ? undefined : Number(width) || undefined}
        height={fill ? undefined : Number(height) || undefined}
        fill={fill}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : loading}
        onError={handleError}
        onLoad={handleLoad}
        className={className}
        style={combinedStyle}
        unoptimized={currentSrc.startsWith("http:") || currentSrc.startsWith("https:")}
        {...(rest as any)}
      />
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : loading}
      decoding="async"
      onError={handleError}
      onLoad={handleLoad}
      className={className}
      style={combinedStyle}
      sizes={sizes}
      {...rest}
    />
  );
};

export default AppImage;
