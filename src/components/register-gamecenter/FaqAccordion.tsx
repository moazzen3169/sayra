"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FAQ_ITEMS } from "@/data/registerGamecenterContent";
import { cn } from "@/lib/utils";

export const FaqAccordion: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openId === item.id;
        const panelId = `faq-panel-${item.id}`;
        const buttonId = `faq-btn-${item.id}`;
        const num = String(idx + 1).padStart(2, "0");

        return (
          <div key={item.id}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="group flex min-h-14 w-full items-center justify-between gap-4 py-5 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F34A]/60 cursor-pointer"
              >
                <span className="flex items-center gap-4 sm:gap-6">
                  <span
                    dir="ltr"
                    className={cn(
                      "text-xs transition-colors",
                      isOpen ? "text-[#B8F34A]" : "text-white/30 group-hover:text-[#B8F34A]/70"
                    )}
                  >
                    {num}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold leading-7 transition-colors sm:text-base",
                      isOpen ? "text-[#B8F34A]" : "text-[#F4F5EF] group-hover:text-white"
                    )}
                  >
                    {item.question}
                  </span>
                </span>

                <Icon
                  name="chevron"
                  size={18}
                  className={cn(
                    "shrink-0 transition-transform duration-300",
                    isOpen ? "rotate-180 text-[#B8F34A]" : "text-white/40 group-hover:text-white/70"
                  )}
                />
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pr-8 pb-6 text-sm leading-8 text-white/50 sm:pr-10"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
};
