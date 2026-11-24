import React from "react";
import { cn } from "@/lib/utils";

export interface RatingHeartIconProps {
  /** Controlled icon size in pixels (width & height). */
  size?: number;
  /** Whether the rating heart is active/filled (false dims it for unselected rating steps). */
  active?: boolean;
  className?: string;
}

export const RatingHeartIcon: React.FC<RatingHeartIconProps> = ({
  size = 16,
  active = true,
  className,
}) => (
  <img
    src="/img/heart.svg"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    draggable={false}
    style={{ width: size, height: size }}
    className={cn(
      "inline-block shrink-0 object-contain select-none transition-all duration-150",
      !active && "opacity-35 grayscale",
      className
    )}
  />
);
