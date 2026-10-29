import React from "react";
import type { BlogContentBlock } from "@/types/blog";

/** نمایش محتوای ساختاریافته‌ی مقاله (بدون HTML خام) */
export const BlogArticleContent: React.FC<{ blocks: BlogContentBlock[] }> = ({
  blocks,
}) => (
  <div className="flex flex-col gap-4">
    {blocks.map((block, index) => {
      switch (block.type) {
        case "heading":
          return (
            <h2
              key={index}
              className="pt-4 text-base font-bold leading-7 text-[var(--text-white)]"
            >
              {block.text}
            </h2>
          );
        case "paragraph":
          return (
            <p
              key={index}
              className="text-sm leading-8 text-[var(--text-white)]/90"
            >
              {block.text}
            </p>
          );
        case "list":
          return (
            <ul
              key={index}
              className="flex list-disc flex-col gap-2 ps-5 text-sm leading-7 text-[var(--text-white)]/90 marker:text-[var(--primary)]"
            >
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        case "quote":
          return (
            <blockquote
              key={index}
              className="border-s-2 border-[var(--primary)] py-1 ps-4 text-sm leading-8 text-[var(--text-muted)]"
            >
              {block.text}
            </blockquote>
          );
        default:
          return null;
      }
    })}
  </div>
);