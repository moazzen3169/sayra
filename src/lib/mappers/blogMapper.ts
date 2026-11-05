/**
 * Blog Platform Data Layer Mappers
 * Bidirectional transformation between Backend API DTOs and UI Models.
 *
 * Rules:
 * - Controlled handling of missing / nullable data without fabricating fake values silently.
 * - Reading time: seconds to minutes using `Math.ceil(reading_time_sec / 60)`.
 * - Status: bidirectional mapping between PostStatusApiEnum and BlogPostStatus.
 * - Content blocks: conversion between backend JSON blocks / HTML content and UI BlogContentBlock[].
 */

import type {
  BlogPostDetail,
  BlogPostStatus,
  BlogPostSummary,
  BlogCategory,
  BlogContentBlock,
  AdminBlogPostInput,
} from "@/types/blog";
import type {
  ArticleDetailDto,
  ArticleListDto,
  CategoryDto,
  PostStatusApiEnum,
  TagDto,
  ArticleCreateUpdateRequestDto,
  PatchedArticleCreateUpdateRequestDto,
} from "@/types/blogApi";

/**
 * Status mapping: Backend API (lowercase) -> UI (UPPERCASE)
 */
export function mapApiStatusToUi(status?: PostStatusApiEnum): BlogPostStatus {
  switch (status) {
    case "published":
      return "PUBLISHED";
    case "archived":
      return "ARCHIVED";
    case "draft":
    case "review":
    case "scheduled":
    default:
      return "DRAFT";
  }
}

/**
 * Status mapping: UI (UPPERCASE) -> Backend API (lowercase)
 */
export function mapUiStatusToApi(status?: BlogPostStatus): PostStatusApiEnum {
  switch (status) {
    case "PUBLISHED":
      return "published";
    case "ARCHIVED":
      return "archived";
    case "DRAFT":
    default:
      return "draft";
  }
}

/**
 * Convert reading time from seconds to minutes (Math.ceil, minimum 1 minute if positive)
 */
export function secondsToMinutes(seconds?: number): number {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds <= 0) {
    return 1;
  }
  return Math.ceil(seconds / 60);
}

/**
 * Convert reading minutes to seconds for API payload
 */
export function minutesToSeconds(minutes?: number): number {
  if (typeof minutes !== "number" || isNaN(minutes) || minutes <= 0) {
    return 60;
  }
  return Math.round(minutes * 60);
}

/**
 * Extract tag names from TagDto array
 */
export function mapTagsToUi(tags?: TagDto[]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (t && typeof t.name === "string" ? t.name.trim() : ""))
    .filter((n): n is string => Boolean(n));
}

/**
 * Map CategoryDto to UI BlogCategory
 */
export function mapCategoryToUi(category: CategoryDto): BlogCategory {
  return {
    id: String(category.id),
    label: category.name || category.slug || "بدون دسته‌بندی",
  };
}

/**
 * Map raw content and blocks to UI BlogContentBlock[]
 */
export function mapBlocksToUi(
  blocks?: Record<string, unknown>[],
  contentBlocks?: Record<string, unknown>[],
  rawContent?: string
): BlogContentBlock[] {
  const result: BlogContentBlock[] = [];
  const sourceBlocks =
    Array.isArray(contentBlocks) && contentBlocks.length > 0
      ? contentBlocks
      : Array.isArray(blocks) && blocks.length > 0
      ? blocks
      : [];

  if (sourceBlocks.length > 0) {
    for (const b of sourceBlocks) {
      if (!b || typeof b !== "object") continue;

      const type = (b.type as string) || (b.block_type as string);
      const val = b.value as Record<string, unknown> | undefined;
      const text =
        typeof b.text === "string"
          ? b.text
          : typeof b.content === "string"
          ? b.content
          : typeof val?.text === "string"
          ? val.text
          : typeof val === "string"
          ? val
          : "";

      if (type === "heading" || type === "header" || type === "h2" || type === "h3") {
        result.push({ type: "heading", text });
      } else if (type === "paragraph" || type === "text" || type === "p") {
        if (text.trim()) {
          result.push({ type: "paragraph", text });
        }
      } else if (type === "quote" || type === "blockquote") {
        result.push({ type: "quote", text });
      } else if (type === "list") {
        const items = Array.isArray(b.items)
          ? b.items.map((i) => String(i))
          : text
          ? [text]
          : [];
        if (items.length > 0) {
          result.push({ type: "list", items });
        }
      }
    }
  }

  // Fallback: If no structured blocks were recognized but rawContent string exists
  if (result.length === 0 && rawContent && typeof rawContent === "string") {
    const paragraphs = rawContent
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const p of paragraphs) {
      if (p.startsWith("#")) {
        result.push({
          type: "heading",
          text: p.replace(/^#+\s*/, ""),
        });
      } else if (p.startsWith(">")) {
        result.push({
          type: "quote",
          text: p.replace(/^>\s*/, ""),
        });
      } else {
        result.push({
          type: "paragraph",
          text: p,
        });
      }
    }
  }

  return result;
}

/**
 * Map UI BlogContentBlock[] to raw content and structured blocks for API payload
 */
export function mapBlocksToApi(blocks?: BlogContentBlock[]): {
  content: string;
  content_blocks: Record<string, unknown>[];
} {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { content: "", content_blocks: [] };
  }

  const contentPieces: string[] = [];
  const content_blocks: Record<string, unknown>[] = [];

  for (const b of blocks) {
    if (b.type === "heading") {
      contentPieces.push(`## ${b.text}`);
      content_blocks.push({ type: "heading", text: b.text });
    } else if (b.type === "paragraph") {
      contentPieces.push(b.text);
      content_blocks.push({ type: "paragraph", text: b.text });
    } else if (b.type === "quote") {
      contentPieces.push(`> ${b.text}`);
      content_blocks.push({ type: "quote", text: b.text });
    } else if (b.type === "list") {
      contentPieces.push(b.items.map((i) => `- ${i}`).join("\n"));
      content_blocks.push({ type: "list", items: b.items });
    }
  }

  return {
    content: contentPieces.join("\n\n"),
    content_blocks,
  };
}

/**
 * Map ArticleListDto to UI BlogPostSummary
 */
export function mapArticleListToSummary(dto: ArticleListDto): BlogPostSummary {
  const coverUrl =
    dto.cover_image && typeof dto.cover_image.url === "string"
      ? dto.cover_image.url
      : "";

  const categoryName =
    typeof dto.category === "string"
      ? dto.category
      : dto.category && typeof dto.category === "object" && "name" in dto.category && typeof (dto.category as any).name === "string"
      ? (dto.category as any).name
      : "";
  const authorName =
    dto.author && typeof dto.author.display_name === "string"
      ? dto.author.display_name
      : "تحریریه سایرا";

  return {
    id: String(dto.id),
    slug: dto.slug || "",
    title: dto.title || "",
    excerpt: dto.excerpt || dto.short_description || "",
    coverUrl,
    category: categoryName,
    categoryLabel: categoryName || "عمومی",
    authorName,
    publishedAt: dto.published_at || "",
    readingMinutes: secondsToMinutes(dto.reading_time_sec),
    tags: mapTagsToUi(dto.tags),
    featured: Boolean(dto.is_hot),
    status: mapApiStatusToUi(dto.status),
    viewsCount: typeof dto.views_count === "number" ? dto.views_count : 0,
  };
}

/**
 * Map ArticleDetailDto to UI BlogPostDetail
 */
export function mapArticleDetailToUi(dto: ArticleDetailDto): BlogPostDetail {
  const summary = mapArticleListToSummary(dto);
  const blocks = mapBlocksToUi(dto.blocks, dto.content_blocks, dto.content);

  return {
    ...summary,
    content: blocks,
  };
}

/**
 * Map UI AdminBlogPostInput to ArticleCreateUpdateRequestDto
 */
export function mapAdminInputToCreateRequest(
  input: AdminBlogPostInput,
  categoryId?: number,
  tagIds?: number[],
  coverImageId?: string | null
): ArticleCreateUpdateRequestDto {
  const { content, content_blocks } = mapBlocksToApi(input.content);

  return {
    title: input.title.trim(),
    slug: input.slug.trim(),
    excerpt: input.excerpt.trim(),
    short_description: input.excerpt.trim(),
    content,
    content_blocks,
    status: mapUiStatusToApi(input.status),
    visibility: "public",
    is_hot: Boolean(input.featured),
    category_id: categoryId,
    tag_ids: tagIds,
    cover_image_id: coverImageId,
    publish_at: input.publishedAt || null,
  };
}

/**
 * Map Partial<AdminBlogPostInput> to PatchedArticleCreateUpdateRequestDto
 */
export function mapAdminInputToPatchRequest(
  input: Partial<AdminBlogPostInput>,
  categoryId?: number,
  tagIds?: number[],
  coverImageId?: string | null
): PatchedArticleCreateUpdateRequestDto {
  const patch: PatchedArticleCreateUpdateRequestDto = {};

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.slug !== undefined) patch.slug = input.slug.trim();
  if (input.excerpt !== undefined) {
    patch.excerpt = input.excerpt.trim();
    patch.short_description = input.excerpt.trim();
  }
  if (input.status !== undefined) patch.status = mapUiStatusToApi(input.status);
  if (input.featured !== undefined) patch.is_hot = Boolean(input.featured);
  if (input.publishedAt !== undefined) patch.publish_at = input.publishedAt;
  if (categoryId !== undefined) patch.category_id = categoryId;
  if (tagIds !== undefined) patch.tag_ids = tagIds;
  if (coverImageId !== undefined) patch.cover_image_id = coverImageId;

  if (input.content !== undefined) {
    const { content, content_blocks } = mapBlocksToApi(input.content);
    patch.content = content;
    patch.content_blocks = content_blocks;
  }

  return patch;
}
