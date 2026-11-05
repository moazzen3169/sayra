import React from "react";
import type { BlogContentBlock } from "@/types/blog";

/** نمایش محتوای ساختاریافته‌ی مقاله (بدون HTML خام، مقاوم در برابر ساختارهای نامعتبر) */
export const BlogArticleContent: React.FC<{ blocks: BlogContentBlock[] }> = ({
  blocks,
}) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        if (!block || typeof block !== "object") return null;

        switch (block.type) {
          case "heading": {
            if (!block.text || !block.text.trim()) return null;
            return (
              <h2
                key={index}
                className="pt-4 text-base font-bold leading-7 text-[var(--text-white)]"
              >
                {block.text}
              </h2>
            );
          }
          case "paragraph": {
            if (!block.text || !block.text.trim()) return null;
            return (
              <p
                key={index}
                className="text-sm leading-8 text-[var(--text-white)]/90"
              >
                {block.text}
              </p>
            );
          }
          case "list": {
            const items = Array.isArray(block.items)
              ? block.items.filter((item) => typeof item === "string" && item.trim())
              : [];
            if (items.length === 0) return null;
            return (
              <ul
                key={index}
                className="flex list-disc flex-col gap-2 ps-5 text-sm leading-7 text-[var(--text-white)]/90 marker:text-[var(--primary)]"
              >
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
          }
          case "quote": {
            if (!block.text || !block.text.trim()) return null;
            return (
              <blockquote
                key={index}
                className="border-s-2 border-[var(--primary)] py-1 ps-4 text-sm leading-8 text-[var(--text-muted)]"
              >
                {block.text}
              </blockquote>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
};
