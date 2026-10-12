import React from "react";

export interface GamecenterCardBigProps {
  id: string;
  name: string;
  imageUrl: string;
  location: string;
  rating: number;
  reviewsCount?: number;
  hourlyPrice: number;
  availableStations?: string[];
  isOpen?: boolean;
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  onClick?: (id: string) => void;
}

export const GamecenterCardBig: React.FC<GamecenterCardBigProps> = ({
  id,
  name,
  imageUrl,
  location,
  rating,
  reviewsCount = 0,
  hourlyPrice,
  availableStations = ["PS5", "VIP PC", "Xbox Series X"],
  isOpen = true,
  isBookmarked = false,
  onBookmarkToggle,
  onClick,
}) => {
  return (
    <div
      onClick={() => onClick?.(id)}
      className="group relative w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:border-[var(--primary)] hover:shadow-[0_0_20px_rgba(255,255,61,0.15)] cursor-pointer flex flex-col"
    >
      {/* Top Banner Image Container */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-[var(--foreground)]">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            // Fallback placeholder image gradient
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-black/40" />

        {/* Status Badge (Open/Closed) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#101014]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              isOpen ? "bg-[var(--accent-green)] animate-pulse" : "bg-[var(--accent-red)]"
            }`}
          />
          <span className={isOpen ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}>
            {isOpen ? "فعال و باز" : "بسته"}
          </span>
        </div>

        {/* Bookmark Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBookmarkToggle?.(id);
          }}
          className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-[#101014]/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all"
          aria-label="افزودن به علاقه‌مندی‌ها"
        >
          <svg
            className={`w-5 h-5 ${isBookmarked ? "text-[var(--primary)] fill-[var(--primary)]" : "fill-none"}`}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>

        {/* Rating Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-[#101014]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[var(--primary)]/30 text-xs font-bold text-[var(--text-white)]">
          <svg className="w-4 h-4 text-[var(--accent-star)] fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{rating.toFixed(1)}</span>
          {reviewsCount > 0 && (
            <span className="text-[var(--text-muted)] font-normal text-[10px]">({reviewsCount})</span>
          )}
        </div>
      </div>

      {/* Card Content & Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base text-[var(--text-white)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
              {name}
            </h3>
            <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
              <svg className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{location}</span>
            </p>
          </div>
        </div>

        {/* Station Tags */}
        <div className="flex flex-wrap gap-1.5 my-1">
          {availableStations.map((station, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-[var(--foreground)]/60 text-[var(--text-muted)] border border-[var(--border-subtle)] text-[11px] font-medium"
            >
              {station}
            </span>
          ))}
        </div>

        {/* Card Footer: Price & Quick Action */}
        <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between mt-auto">
          <div>
            <span className="text-[10px] text-[var(--text-subtle)] block">شروع قیمت از:</span>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-base text-[var(--primary)]">
                {hourlyPrice.toLocaleString("fa-IR")}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">تومان / ساعت</span>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[#101014] text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(255,255,61,0.2)]"
          >
            <span>رزرو نوبت</span>
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
