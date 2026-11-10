"use client";

import React from "react";
import { AppImage, type AppImageProps } from "@/components/common/AppImage";
import { resolveMediaUrl, PLACEHOLDERS } from "@/lib/media";

export interface SafeImageProps extends AppImageProps {
  /** Optional thumbnail source used if preferThumbnail is true or as intermediate */
  thumbSrc?: string | null;
  /** Whether to prefer thumbSrc over src */
  preferThumbnail?: boolean;
}

/**
 * Backward-compatible wrapper around centralized `AppImage`.
 * Seamlessly resolves legacy media thumbnail preferences and custom fallbacks.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  thumbSrc,
  preferThumbnail = false,
  fallbackSrc = PLACEHOLDERS.center,
  ...props
}) => {
  const resolvedSrc = React.useMemo(() => {
    const stringSrc = typeof src === "string" ? src : undefined;
    return resolveMediaUrl(
      {
        url: stringSrc,
        thumbUrl: thumbSrc,
      },
      preferThumbnail
    );
  }, [src, thumbSrc, preferThumbnail]);

  return (
    <AppImage
      src={resolvedSrc || src}
      fallbackSrc={fallbackSrc}
      {...props}
    />
  );
};

export default SafeImage;
