import React from "react";

export interface GamecenterCardMiniProps {
  id: string;
  name: string;
  imageUrl: string;
  location: string;
  rating: number;
  hourlyPrice: number;
  primaryStation?: string;
  onClick?: (id: string) => void;
}

export const GamecenterCardMini: React.FC<GamecenterCardMiniProps> = ({
  id,
  name,
  imageUrl,
  location,
  rating,
  hourlyPrice,
  primaryStation = "PS5 / VIP",
  onClick,
}) => {
  return (
    <div
      onClick={() => onClick?.(id)}
      className="group min-w-[180px] w-[180px] sm:min-w-[200px] sm:w-[200px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:border-[var(--primary)] hover:shadow-[0_0_15px_rgba(255,255,61,0.15)] cursor-pointer flex flex-col shrink-0"
    >
      {/* Thumbnail Image */}
      <div className="relative w-full h-28 sm:h-32 bg-[var(--foreground)] overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />

        {/* Rating badge */}
        <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-[#101014]/85 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 text-[10px] font-bold text-[var(--text-white)]">
          <svg className="w-3 h-3 text-[var(--accent-star)] fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{rating.toFixed(1)}</span>
        </div>

        {/* Primary device tag */}
        <div className="absolute bottom-1.5 left-1.5 bg-[var(--primary)] text-[#101014] text-[9px] font-black px-1.5 py-0.5 rounded-md">
          {primaryStation}
        </div>
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-[var(--text-white)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
            {name}
          </h4>
          <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
            {location}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] mt-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-extrabold text-xs text-[var(--primary)]">
              {hourlyPrice.toLocaleString("fa-IR")}
            </span>
            <span className="text-[9px] text-[var(--text-subtle)]">تومان</span>
          </div>
          <span className="text-[10px] font-semibold text-[var(--primary)] group-hover:underline">
            رزرو
          </span>
        </div>
      </div>
    </div>
  );
};
