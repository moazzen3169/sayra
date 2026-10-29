"use client";

import React, { useMemo, useState } from "react";
import { toPersianDigits } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import type { GameItem } from "@/types/gamecenter";

const normalize = (v: string) =>
  v
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const GameTile: React.FC<{ game: GameItem; className?: string }> = ({ game, className = "w-28 sm:w-32 aspect-[3/4]" }) => {
  const [failed, setFailed] = useState(false);
  const hasLogo = !!game.logo && !failed;

  return (
    <div
      title={game.name}
      className={`rounded-card overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-md shrink-0 flex items-center justify-center relative group transition-transform hover:scale-[1.02] ${className}`}
    >
      {hasLogo ? (
        <img
          src={game.logo}
          alt={game.name}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="p-3 text-center flex items-center justify-center w-full h-full bg-[var(--foreground)]/40">
          <span className="text-xs font-bold text-[var(--text-white)] leading-snug line-clamp-3">
            {game.name}
          </span>
        </div>
      )}
    </div>
  );
};

export const GamesMarquee: React.FC<{ games: GameItem[] }> = ({ games }) => {
  const [query, setQuery] = useState("");
  const q = normalize(query);

  const results = useMemo(
    () => (q ? games.filter((g) => normalize(g.name).includes(q)) : []),
    [games, q]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--primary)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی بازی در این گیمنت…"
          aria-label="جستجوی بازی"
          autoComplete="off"
          className="h-11 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] pr-10 pl-10 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="پاک کردن جستجو"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-[var(--text-white)]"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      {q ? (
        results.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              {toPersianDigits(results.length)} بازی پیدا شد
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {results.map((g) => (
                <GameTile key={g.id} game={g} className="w-full aspect-[3/4]" />
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center flex flex-col gap-1">
            <p className="text-sm font-bold text-[var(--text-white)]">این بازی در این گیمنت پیدا نشد</p>
            <p className="text-xs text-[var(--text-muted)]">نام را کوتاه‌تر یا به انگلیسی جستجو کنید.</p>
          </div>
        )
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {games.map((g) => (
            <GameTile key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
};
