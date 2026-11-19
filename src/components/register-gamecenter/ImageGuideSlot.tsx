import React from "react";
import { Icon } from "@/components/ui/Icon";
import { AppImage } from "@/components/common/AppImage";
import type { ImageGuideConfig } from "@/data/registerGamecenterContent";
import { cn } from "@/lib/utils";

interface ImageGuideSlotProps {
  guide: ImageGuideConfig;
  className?: string;
  priority?: boolean;
}

export const ImageGuideSlot: React.FC<ImageGuideSlotProps> = ({
  guide,
  className,
  priority = false,
}) => {
  const hasRealImage = Boolean(guide.src && guide.src.trim().length > 0);

  return (
    <figure
      id={guide.id}
      className={cn(
        "flex flex-col overflow-hidden rounded-card border border-[var(--border-color)] bg-[var(--bg-card)]",
        className
      )}
    >
      {/* Visual Frame */}
      <div
        className={cn(
          "relative w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-body)]",
          guide.aspectClass
        )}
      >
        {hasRealImage ? (
          <AppImage
            src={guide.src}
            alt={guide.alt || guide.title}
            fill
            priority={priority}
            sizes="(max-width: 1024px) 100vw, 560px"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="relative flex h-full w-full flex-col items-center justify-center p-4 text-center">
            {/* Subtle architectural grid background using design tokens */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--border-subtle)_1px,transparent_1px),linear-gradient(90deg,var(--border-subtle)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60"
            />

            {/* Corner registration marks */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r-2 border-t-2 border-[var(--primary)]/50"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 border-[var(--primary)]/50"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-[var(--primary)]/50"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b-2 border-l-2 border-[var(--primary)]/50"
            />

            <div className="relative z-10 flex max-w-sm flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--primary)]/30 bg-[var(--primary-muted)] text-[var(--primary)]">
                <Icon name="image" size={24} />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold leading-none text-[var(--text-white)]">
                  {guide.slotNumber}
                </span>
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--foreground)]/50 px-2.5 py-1 text-xs font-medium leading-none text-[var(--text-muted)]">
                  {guide.aspectRatioLabel}
                </span>
              </div>

              <p className="text-xs font-medium leading-5 text-[var(--text-muted)]">
                محل قرارگیری تصویر راهنما
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Title & Purpose Caption */}
      <figcaption className="flex flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-child bg-[var(--primary-muted)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
            عنوان تصویر
          </span>
          <p className="text-sm font-bold leading-6 text-[var(--text-white)]">
            {guide.title}
          </p>
        </div>

        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-child bg-[var(--foreground)]/60 px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
            هدف تصویر
          </span>
          <p className="text-xs font-medium leading-6 text-[var(--text-muted)]">
            {guide.purpose}
          </p>
        </div>
      </figcaption>
    </figure>
  );
};
