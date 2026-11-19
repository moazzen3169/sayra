"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FAQ_ITEMS } from "@/data/registerGamecenterContent";
import { cn } from "@/lib/utils";

export const FaqAccordion: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0]?.id ?? null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-3">
      {FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        const buttonId = `faq-btn-${item.id}`;

        return (
          <div
            key={item.id}
            className={cn(
              "overflow-hidden rounded-card border transition-colors",
              isOpen
                ? "border-[var(--primary)]/40 bg-[var(--bg-card)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]"
            )}
          >
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3.5 text-right text-sm font-bold leading-6 text-[var(--text-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
              >
                <span>{item.question}</span>
                <Icon
                  name="chevron"
                  size={20}
                  className={cn(
                    "shrink-0 text-[var(--text-muted)] transition-transform duration-200",
                    isOpen && "rotate-180 text-[var(--primary)]"
                  )}
                />
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="border-t border-[var(--border-subtle)] px-4 py-3.5 text-xs font-medium leading-7 text-[var(--text-muted)] sm:text-sm sm:leading-7"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
};
