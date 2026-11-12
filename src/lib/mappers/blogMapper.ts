
/**
 * Blog Platform Data Layer Mappers
 *
 * Bidirectional transformation between Backend API DTOs and UI Models.
 *
 * Content block contract:
 * - Every block must contain id, type and version.
 * - All currently supported block definitions use version 1.
 * - Heading requires level and text.
 * - Paragraph requires structured content node arrays.
 * - Quote requires text.
 * - The current API does not define a list block.
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
 * Generate a unique content block ID.
 */
function createBlockId(): string {
  return crypto.randomUUID();
}

/**
 * Extract plain text from structured paragraph nodes.
 *
 * Paragraph nodes can contain:
 * - value
 * - children
 */
function extractParagraphText(nodes: unknown): string {
  if (typeof nodes === "string") {
    return nodes;
  }

  if (!Array.isArray(nodes)) {
    return "";
  }

  return nodes
    .map((node: unknown) => {
      if (!node || typeof node !== "object") {
        return "";
      }

      const item = node as Record<string, unknown>;

      const value =
        typeof item.value === "string" ? item.value : "";

      const children = extractParagraphText(item.children);

      return value + children;
    })
    .join("");
}

/**
 * Status mapping: Backend API -> UI
 */
export function mapApiStatusToUi(
  status?: PostStatusApiEnum
): BlogPostStatus {
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
 * Status mapping: UI -> Backend API
 */
export function mapUiStatusToApi(
  status?: BlogPostStatus
): PostStatusApiEnum {
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
 * Convert reading time from seconds to minutes.
 */
export function secondsToMinutes(seconds?: number): number {
  if (
    typeof seconds !== "number" ||
    isNaN(seconds) ||
    seconds <= 0
  ) {
    return 1;
  }

  return Math.ceil(seconds / 60);
}

/**
 * Convert reading minutes to seconds for API payload.
 */
export function minutesToSeconds(minutes?: number): number {
  if (
    typeof minutes !== "number" ||
    isNaN(minutes) ||
    minutes <= 0
  ) {
    return 60;
  }

  return Math.round(minutes * 60);
}

/**
 * Extract tag names from TagDto array.
 */
export function mapTagsToUi(tags?: TagDto[]): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) =>
      tag && typeof tag.name === "string"
        ? tag.name.trim()
        : ""
    )
    .filter(Boolean);
}

/**
 * Map CategoryDto to UI BlogCategory.
 */
export function mapCategoryToUi(
  category: CategoryDto
): BlogCategory {
  return {
    id: String(category.id),
    label:
      category.name ||
      category.slug ||
      "بدون دسته‌بندی",
  };
}

/**
 * Map API content blocks to UI BlogContentBlock[].
 *
 * Supports structured paragraph content nodes.
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
    for (const block of sourceBlocks) {
      if (!block || typeof block !== "object") {
        continue;
      }

      const type =
        typeof block.type === "string"
          ? block.type
          : typeof block.block_type === "string"
          ? block.block_type
          : "";

      const value =
        block.value &&
        typeof block.value === "object" &&
        !Array.isArray(block.value)
          ? (block.value as Record<string, unknown>)
          : undefined;

      if (
        type === "heading" ||
        type === "header" ||
        type === "h1" ||
        type === "h2" ||
        type === "h3" ||
        type === "h4" ||
        type === "h5" ||
        type === "h6"
      ) {
        const text =
          typeof block.text === "string"
            ? block.text
            : typeof value?.text === "string"
            ? value.text
            : "";

        if (text.trim()) {
          result.push({
            type: "heading",
            text,
          });
        }
      } else if (
        type === "paragraph" ||
        type === "text" ||
        type === "p"
      ) {
        const text =
          typeof block.text === "string"
            ? block.text
            : typeof block.content === "string"
            ? block.content
            : Array.isArray(block.content)
            ? extractParagraphText(block.content)
            : typeof value?.text === "string"
            ? value.text
            : "";

        if (text.trim()) {
          result.push({
            type: "paragraph",
            text,
          });
        }
      } else if (
        type === "quote" ||
        type === "blockquote"
      ) {
        const text =
          typeof block.text === "string"
            ? block.text
            : typeof value?.text === "string"
            ? value.text
            : "";

        if (text.trim()) {
          result.push({
            type: "quote",
            text,
          });
        }
      } else if (type === "list") {
        const items = Array.isArray(block.items)
          ? block.items.map((item) => String(item))
          : [];

        if (items.length > 0) {
          result.push({
            type: "list",
            items,
          });
        }
      }
    }
  }

  /**
   * Fallback:
   * If no structured blocks were recognized,
   * parse the raw content string.
   */
  if (
    result.length === 0 &&
    typeof rawContent === "string" &&
    rawContent.trim()
  ) {
    const paragraphs = rawContent
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    for (const paragraph of paragraphs) {
      if (paragraph.startsWith("#")) {
        result.push({
          type: "heading",
          text: paragraph.replace(/^#+\s*/, ""),
        });
      } else if (paragraph.startsWith(">")) {
        result.push({
          type: "quote",
          text: paragraph.replace(/^>\s*/, ""),
        });
      } else {
        result.push({
          type: "paragraph",
          text: paragraph,
        });
      }
    }
  }

  return result;
}

/**
 * Map UI BlogContentBlock[] to API content and content_blocks.
 *
 * IMPORTANT:
 * The current backend contract does not define a "list" type.
 * Therefore, list items are converted into paragraph blocks.
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

  // شماره ترتیب بلوک‌ها از صفر شروع می‌شود.
  const addBlock = (block: Record<string, unknown>) => {
    content_blocks.push({
      ...block,
      order: content_blocks.length,
    });
  };

  for (const block of blocks) {
    if (block.type === "heading") {
      const text = block.text.trim();
      if (!text) continue;

      contentPieces.push(`## ${text}`);

      addBlock({
        id: createBlockId(),
        type: "heading",
        version: 1,
        level: 2,
        text,
      });
    } else if (block.type === "paragraph") {
      const text = block.text.trim();
      if (!text) continue;

      contentPieces.push(text);

      addBlock({
        id: createBlockId(),
        type: "paragraph",
        version: 1,
        content: [{ type: "text", value: text }],
      });
    } else if (block.type === "quote") {
      const text = block.text.trim();
      if (!text) continue;

      contentPieces.push(`> ${text}`);

      addBlock({
        id: createBlockId(),
        type: "quote",
        version: 1,
        text,
      });
    } else if (block.type === "list") {
      const items = block.items.map((item) => item.trim()).filter(Boolean);
      if (items.length === 0) continue;

      contentPieces.push(items.map((item) => `- ${item}`).join("\n"));

      for (const item of items) {
        addBlock({
          id: createBlockId(),
          type: "paragraph",
          version: 1,
          content: [{ type: "text", value: `• ${item}` }],
        });
      }
    }
  }

  return {
    content: contentPieces.join("\n\n"),
    content_blocks,
  };
}


/**
 * Map ArticleListDto to UI BlogPostSummary.
 */
export function mapArticleListToSummary(
  dto: ArticleListDto
): BlogPostSummary {
  const coverUrl =
    dto.cover_image &&
    typeof dto.cover_image.url === "string"
      ? dto.cover_image.url
      : "";

  const categoryName =
    typeof dto.category === "string"
      ? dto.category
      : dto.category &&
        typeof dto.category === "object" &&
        "name" in dto.category &&
        typeof (dto.category as any).name === "string"
      ? (dto.category as any).name
      : "";

  const authorName =
    dto.author &&
    typeof dto.author.display_name === "string"
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
    viewsCount:
      typeof dto.views_count === "number"
        ? dto.views_count
        : 0,
  };
}

/**
 * Map ArticleDetailDto to UI BlogPostDetail.
 */
export function mapArticleDetailToUi(
  dto: ArticleDetailDto
): BlogPostDetail {
  const summary = mapArticleListToSummary(dto);

  const blocks = mapBlocksToUi(
    dto.blocks,
    dto.content_blocks,
    dto.content
  );

  return {
    ...summary,
    content: blocks,
  };
}

/**
 * Map UI AdminBlogPostInput to API create request.
 */
export function mapAdminInputToCreateRequest(
  input: AdminBlogPostInput,
  categoryId?: number,
  tagIds?: number[],
  coverImageId?: string | null
): ArticleCreateUpdateRequestDto {
  const { content, content_blocks } = mapBlocksToApi(
    input.content
  );

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
 * Map Partial<AdminBlogPostInput> to API PATCH request.
 */
export function mapAdminInputToPatchRequest(
  input: Partial<AdminBlogPostInput>,
  categoryId?: number,
  tagIds?: number[],
  coverImageId?: string | null
): PatchedArticleCreateUpdateRequestDto {
  const patch: PatchedArticleCreateUpdateRequestDto = {};

  if (input.title !== undefined) {
    patch.title = input.title.trim();
  }

  if (input.slug !== undefined) {
    patch.slug = input.slug.trim();
  }

  if (input.excerpt !== undefined) {
    patch.excerpt = input.excerpt.trim();
    patch.short_description = input.excerpt.trim();
  }

  if (input.status !== undefined) {
    patch.status = mapUiStatusToApi(input.status);
  }

  if (input.featured !== undefined) {
    patch.is_hot = Boolean(input.featured);
  }

  if (input.publishedAt !== undefined) {
    patch.publish_at = input.publishedAt;
  }

  if (categoryId !== undefined) {
    patch.category_id = categoryId;
  }

  if (tagIds !== undefined) {
    patch.tag_ids = tagIds;
  }

  if (coverImageId !== undefined) {
    patch.cover_image_id = coverImageId;
  }

  if (input.content !== undefined) {
    const { content, content_blocks } = mapBlocksToApi(
      input.content
    );

    patch.content = content;
    patch.content_blocks = content_blocks;
  }

  return patch;
}
