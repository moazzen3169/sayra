/**
 * Blog Platform Data Layer Mappers
 *
 * Bidirectional transformation between API DTOs and UI models.
 * Content blocks follow GET /api/articles/block-definitions/.
 */

import type {
  BlogPostDetail,
  BlogPostStatus,
  BlogPostSummary,
  BlogCategory,
  BlogContentBlock,
  BlogRichTextNode,
  AdminBlogPostInput,
} from "@/types/blog";

import type {
  ArticleDetailDto,
  ArticleListDto,
  CategoryDto,
  PostStatusApiEnum,
  TagDto,
  ArticleContentBlockDto,
  ArticleCreateUpdateRequestDto,
  PatchedArticleCreateUpdateRequestDto,
} from "@/types/blogApi";
import { BLOG_API_BASE_URL } from "@/lib/api/config";
/* ==========================================================================
   HELPERS
   ========================================================================== */

type RawBlock = Record<string, unknown>;

const SUPPORTED_BLOCK_TYPES = new Set([
  "heading",
  "paragraph",
  "image",
  "gallery",
  "quote",
  "table",
  "code",
  "divider",
  "video",
  "embed",
  "button",
  "accordion",
  "faq",
  "location",
  "timeline",
  "related_articles",
]);

function createBlockId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `block-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function isRecord(value: unknown): value is RawBlock {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function normalizeBlockBase(
  block: RawBlock,
  index: number
): RawBlock {
  return {
    ...block,
    id:
      typeof block.id === "string" && block.id.trim()
        ? block.id
        : createBlockId(),
    version:
      typeof block.version === "number" && block.version > 0
        ? block.version
        : 1,
    order: index,
  };
}

function extractParagraphText(nodes: unknown): string {
  if (typeof nodes === "string") {
    return nodes;
  }

  if (!Array.isArray(nodes)) {
    return "";
  }

  return nodes
    .map((node: unknown) => {
      if (!isRecord(node)) {
        return "";
      }

      const value = asString(node.value);
      const children = extractParagraphText(node.children);

      return value + children;
    })
    .join("");
}

function blockToPlainText(block: BlogContentBlock): string {
  switch (block.type) {
    case "heading":
      return block.text;

    case "paragraph":
      return Array.isArray(block.content)
        ? extractParagraphText(block.content)
        : block.text || "";

    case "quote":
      return block.text;

    case "image":
      return block.caption || block.alt || "";

 case "gallery":
  return typeof block.caption === "string" ? block.caption : "";

    case "table":
      return [
        block.headers.join(" | "),
        ...block.rows.map((row) => row.join(" | ")),
      ].join("\n");

    case "code":
      return block.code;

    case "divider":
      return "---";

    case "video":
      return block.external_url || "";

    case "embed":
      return block.url;

    case "button":
      return `${block.label}: ${block.url}`;

    case "accordion":
      return block.items
        .map((item) => `${item.title}\n${item.content}`)
        .join("\n\n");

    case "faq":
      return block.questions
        .map((item) => `سؤال: ${item.q}\nپاسخ: ${item.a}`)
        .join("\n\n");

    case "location":
      return [
        block.title,
        block.address?.country,
        block.address?.province,
        block.address?.city,
        block.address?.street,
        block.description,
      ]
        .filter(Boolean)
        .join("\n");

    case "timeline":
      return [
        block.title,
        ...block.events.map(
          (event) =>
            `${event.date?.value || ""} ${event.title}\n${event.description}`
        ),
      ].join("\n\n");

    case "related_articles":
      return block.article_ids.join(", ");

    case "list":
      return block.items.map((item) => `• ${item}`).join("\n");

    case "unsupported":
      return "";
  }
}




function validateApiBlock(block: RawBlock, index: number): void {
  const type = asString(block.type);
  const data = block.data;

  const prefix = `بلوک شماره ${index + 1} (${type || "نامشخص"})`;

  if (typeof block.id !== "string" || !block.id.trim()) {
    throw new Error(`${prefix}: شناسه id الزامی است.`);
  }

  if (
    typeof block.version !== "number" ||
    !Number.isInteger(block.version) ||
    block.version < 1
  ) {
    throw new Error(`${prefix}: فیلد version باید عدد صحیح مثبت باشد.`);
  }

  if (
    typeof block.order !== "number" ||
    !Number.isInteger(block.order) ||
    block.order < 0
  ) {
    throw new Error(`${prefix}: فیلد order معتبر نیست.`);
  }

  if (!isRecord(data)) {
    throw new Error(`${prefix}: فیلد data باید یک JSON Object باشد.`);
  }

  const requireString = (field: string) => {
    if (
      typeof data[field] !== "string" ||
      !(data[field] as string).trim()
    ) {
      throw new Error(`${prefix}: فیلد data.${field} الزامی است.`);
    }
  };

  const requireArray = (field: string) => {
    if (!Array.isArray(data[field])) {
      throw new Error(`${prefix}: فیلد data.${field} باید آرایه باشد.`);
    }
  };

  switch (type) {
    case "heading":
      requireString("text");

      if (
        typeof data.level !== "number" ||
        !Number.isInteger(data.level) ||
        data.level < 1 ||
        data.level > 6
      ) {
        throw new Error(`${prefix}: level باید عددی بین ۱ تا ۶ باشد.`);
      }
      break;

    case "paragraph":
      requireArray("content");
      break;

    case "image":
      if (!isPositiveInteger(data.media_id)) {
        throw new Error(
          `${prefix}: media_id باید شناسه رسانه معتبر و مثبت باشد.`
        );
      }
      break;

    case "gallery":
      requireArray("media_ids");

      if (
        !(data.media_ids as unknown[]).every(isPositiveInteger) ||
        (data.media_ids as unknown[]).length === 0
      ) {
        throw new Error(
          `${prefix}: media_ids باید شامل حداقل یک شناسه رسانه معتبر باشد.`
        );
      }
      break;

    case "quote":
      requireString("text");
      break;

    case "table":
      requireArray("headers");
      requireArray("rows");

      if (
        !(data.headers as unknown[]).every(
          (item) => typeof item === "string"
        ) ||
        !(data.rows as unknown[]).every(
          (row) =>
            Array.isArray(row) &&
            row.every((cell) => typeof cell === "string")
        )
      ) {
        throw new Error(
          `${prefix}: headers و rows باید آرایه‌های متنی معتبر باشند.`
        );
      }
      break;

    case "code":
      requireString("code");
      break;

    case "divider":
      if (
        data.style !== undefined &&
        !["solid", "dashed", "dots"].includes(String(data.style))
      ) {
        throw new Error(`${prefix}: style معتبر نیست.`);
      }
      break;

    case "video":
      if (
        !isPositiveInteger(data.media_id) &&
        !(
          typeof data.external_url === "string" &&
          data.external_url.trim()
        )
      ) {
        throw new Error(
          `${prefix}: باید media_id یا external_url معتبر داشته باشد.`
        );
      }
      break;

    case "embed":
      requireString("url");
      break;

    case "button":
      requireString("label");
      requireString("url");
      break;

    case "accordion":
      requireArray("items");

      if (
        !(data.items as unknown[]).every(
          (item) =>
            isRecord(item) &&
            typeof item.title === "string" &&
            typeof item.content === "string"
        )
      ) {
        throw new Error(
          `${prefix}: هر آیتم باید title و content متنی داشته باشد.`
        );
      }
      break;

    case "faq":
      requireArray("questions");

      if (
        !(data.questions as unknown[]).every(
          (item) =>
            isRecord(item) &&
            typeof item.q === "string" &&
            typeof item.a === "string"
        )
      ) {
        throw new Error(
          `${prefix}: هر پرسش باید فیلدهای q و a متنی داشته باشد.`
        );
      }
      break;

    case "location": {
      requireString("title");

      const address = data.address;
      const coordinates = data.coordinates;
      const geo = data.geo;
      const contact = data.contact;
      const openingHours = data.opening_hours;
      const map = data.map;

      if (!isRecord(address)) {
        throw new Error(`${prefix}: address الزامی است.`);
      }

      for (const field of ["country", "province", "city", "street"]) {
        if (
          typeof address[field] !== "string" ||
          !(address[field] as string).trim()
        ) {
          throw new Error(`${prefix}: address.${field} الزامی است.`);
        }
      }

      if (
        !isRecord(coordinates) ||
        typeof coordinates.latitude !== "number" ||
        typeof coordinates.longitude !== "number"
      ) {
        throw new Error(`${prefix}: coordinates معتبر نیست.`);
      }

      if (
        !isRecord(geo) ||
        geo.type !== "Point" ||
        !Array.isArray(geo.coordinates) ||
        geo.coordinates.length !== 2 ||
        typeof geo.coordinates[0] !== "number" ||
        typeof geo.coordinates[1] !== "number"
      ) {
        throw new Error(`${prefix}: geo معتبر نیست.`);
      }

      if (!isRecord(contact)) {
        throw new Error(`${prefix}: contact باید یک object باشد.`);
      }

      if (
        !Array.isArray(openingHours) ||
        !openingHours.every(
          (item) =>
            isRecord(item) &&
            typeof item.day === "string" &&
            typeof item.open === "string" &&
            typeof item.close === "string"
        )
      ) {
        throw new Error(`${prefix}: opening_hours معتبر نیست.`);
      }

      if (
        !isRecord(map) ||
        typeof map.provider !== "string" ||
        typeof map.zoom !== "number"
      ) {
        throw new Error(`${prefix}: map معتبر نیست.`);
      }

      break;
    }

    case "timeline":
      requireString("title");
      requireArray("events");

      if (
        !(data.events as unknown[]).every(
          (event) =>
            isRecord(event) &&
            typeof event.id === "string" &&
            typeof event.title === "string" &&
            typeof event.description === "string" &&
            isRecord(event.date) &&
            ["year", "date", "range"].includes(
              String(event.date.type)
            ) &&
            typeof event.date.value === "string"
        )
      ) {
        throw new Error(
          `${prefix}: هر رویداد باید id، date، title و description معتبر داشته باشد.`
        );
      }
      break;

    case "related_articles":
      requireArray("article_ids");

      if (
        !(data.article_ids as unknown[]).every(isPositiveInteger)
      ) {
        throw new Error(
          `${prefix}: article_ids باید شامل شناسه‌های عددی مثبت باشد.`
        );
      }
      break;

    default:
      throw new Error(
        `${prefix}: این نوع بلوک در قرارداد فعلی API تعریف نشده است.`
      );
  }
}



/* ==========================================================================
   STATUS MAPPING
   ========================================================================== */

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

/* ==========================================================================
   READING TIME
   ========================================================================== */

export function secondsToMinutes(seconds?: number): number {
  if (
    typeof seconds !== "number" ||
    Number.isNaN(seconds) ||
    seconds <= 0
  ) {
    return 1;
  }

  return Math.ceil(seconds / 60);
}

export function minutesToSeconds(minutes?: number): number {
  if (
    typeof minutes !== "number" ||
    Number.isNaN(minutes) ||
    minutes <= 0
  ) {
    return 60;
  }

  return Math.round(minutes * 60);
}

/* ==========================================================================
   TAGS & CATEGORIES
   ========================================================================== */

export function mapTagsToUi(tags?: TagDto[]): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) =>
      tag && typeof tag.name === "string" ? tag.name.trim() : ""
    )
    .filter(Boolean);
}

export function mapCategoryToUi(
  category: CategoryDto
): BlogCategory {
  return {
    id: String(category.id),
    label: category.name || category.slug || "بدون دسته‌بندی",
  };
}

/* ==========================================================================
   BLOCKS: API -> UI
   ========================================================================== */


export function mapBlocksToUi(
  blocks?: Record<string, unknown>[],
  contentBlocks?: Record<string, unknown>[],
  rawContent?: string
): BlogContentBlock[] {
  const sourceBlocks =
    Array.isArray(contentBlocks) && contentBlocks.length > 0
      ? contentBlocks
      : Array.isArray(blocks) && blocks.length > 0
        ? blocks
        : [];

  if (sourceBlocks.length === 0) {
    if (typeof rawContent !== "string" || !rawContent.trim()) {
      return [];
    }

    return rawContent
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part, index) => {
        const id = createBlockId();

        if (part.startsWith("#")) {
          return {
            id,
            version: 1,
            order: index,
            type: "heading" as const,
            level: 2 as const,
            text: part.replace(/^#+\s*/, ""),
          };
        }

        if (part.startsWith(">")) {
          return {
            id,
            version: 1,
            order: index,
            type: "quote" as const,
            text: part.replace(/^>\s*/, ""),
          };
        }

        return {
          id,
          version: 1,
          order: index,
          type: "paragraph" as const,
          content: [{ type: "text" as const, value: part }],
          text: part,
        };
      });
  }

  return sourceBlocks
    .filter(isRecord)
    .map((source, index): BlogContentBlock => {
      /**
       * New API format:
       * {
       *   id,
       *   version,
       *   order,
       *   type,
       *   data: { ... }
       * }
       *
       * Legacy flattened blocks are also supported.
       */
      const payload = isRecord(source.data)
        ? source.data
        : {};

      const block = normalizeBlockBase(
        {
          ...source,
          ...payload,
          id: source.id,
          version: source.version,
          order: source.order,
          type: source.type ?? source.block_type,
        },
        index
      );

      const type =
        typeof block.type === "string"
          ? block.type
          : typeof block.block_type === "string"
            ? block.block_type
            : "";

      if (type === "header" || /^h[1-6]$/.test(type)) {
        const levelFromType = /^h[1-6]$/.test(type)
          ? Number(type.slice(1))
          : 2;

        return {
          ...block,
          type: "heading",
          level:
            typeof block.level === "number"
              ? (block.level as 1 | 2 | 3 | 4 | 5 | 6)
              : (levelFromType as 1 | 2 | 3 | 4 | 5 | 6),
          text: asString(block.text),
        } as BlogContentBlock;
      }

      if (type === "text" || type === "p") {
        const text =
          typeof block.text === "string"
            ? block.text
            : typeof block.content === "string"
              ? block.content
              : Array.isArray(block.content)
                ? extractParagraphText(block.content)
                : "";

        return {
          ...block,
          type: "paragraph",
          content: Array.isArray(block.content)
            ? (block.content as BlogRichTextNode[])
            : [{ type: "text", value: text }],
          text,
        } as BlogContentBlock;
      }

      if (type === "blockquote") {
        return {
          ...block,
          type: "quote",
          text: asString(block.text),
        } as BlogContentBlock;
      }

      if (type === "list") {
        const items = Array.isArray(block.items)
          ? block.items.map(String)
          : [];

        return {
          ...block,
          type: "list",
          items,
        } as BlogContentBlock;
      }

      if (type === "paragraph") {
        const content = Array.isArray(block.content)
          ? (block.content as BlogRichTextNode[])
          : typeof block.content === "string"
            ? [{ type: "text", value: block.content }]
            : [];

        return {
          ...block,
          type: "paragraph",
          content,
          text: extractParagraphText(content),
        } as BlogContentBlock;
      }

      if (SUPPORTED_BLOCK_TYPES.has(type)) {
        return {
          ...block,
          type,
        } as BlogContentBlock;
      }

      /**
       * Unknown block:
       * Preserve the original envelope, including its data.
       */
      return {
        id: String(source.id ?? createBlockId()),
        version:
          typeof source.version === "number"
            ? source.version
            : 1,
        order:
          typeof source.order === "number"
            ? source.order
            : index,
        type: "unsupported",
        originalType: type || "unknown",
        raw: { ...source },
      };
    });
}

/* ==========================================================================
   BLOCKS: UI -> API
   ========================================================================== */

export function mapBlocksToApi(blocks?: BlogContentBlock[]): {
  content: string;
  content_blocks: ArticleContentBlockDto[];
} {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return {
      content: "",
      content_blocks: [],
    };
  }

  const contentBlocks: ArticleContentBlockDto[] = [];
  const contentPieces: string[] = [];

  /**
   * UI model is flattened.
   * API model stores block-specific fields inside data.
   */
  const append = (raw: RawBlock) => {
    const normalized: RawBlock = {
      ...raw,
      id:
        typeof raw.id === "string" && raw.id.trim()
          ? raw.id
          : createBlockId(),
      version:
        typeof raw.version === "number" &&
        Number.isInteger(raw.version) &&
        raw.version > 0
          ? raw.version
          : 1,
      order: contentBlocks.length,
    };

    const {
      id,
      version,
      order,
      type,
      data: existingData,
      ...rest
    } = normalized;

    /**
     * Support both flattened UI objects and already enveloped blocks.
     * Existing data is merged first, then flattened fields override it.
     */
    const payload: RawBlock = {
      ...(isRecord(existingData) ? existingData : {}),
      ...rest,
    };

    const envelope: RawBlock = {
      id,
      version,
      order,
      type,
      data: payload,
    };

    validateApiBlock(envelope, contentBlocks.length);

    contentBlocks.push(
      envelope as unknown as ArticleContentBlockDto
    );
  };

  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }

    if (block.type === "unsupported") {
      /**
       * Keep unknown blocks intact.
       * The raw value may already be an API envelope.
       */
      const raw = { ...block.raw };

      const rawData = isRecord(raw.data)
        ? raw.data
        : {};

      const originalType =
        block.originalType ||
        raw.type;

      if (!SUPPORTED_BLOCK_TYPES.has(String(originalType))) {
        throw new Error(
          `نوع بلوک «${String(originalType)}» در قرارداد فعلی بک‌اند تعریف نشده است. برای جلوگیری از ارسال داده نامعتبر، ذخیره مقاله متوقف شد.`
        );
      }

      append({
        ...rawData,
        ...raw,
        ...block,
        id:
          typeof block.id === "string" && block.id.trim()
            ? block.id
            : typeof raw.id === "string"
              ? raw.id
              : createBlockId(),
        version:
          typeof block.version === "number"
            ? block.version
            : typeof raw.version === "number"
              ? raw.version
              : 1,
        type: String(originalType),
        data: rawData,
      });

      continue;
    }

    if (block.type === "list") {
      /**
       * Legacy UI list is not a backend block type.
       * Convert each item to a valid paragraph block.
       */
      const items = block.items
        .map((item) => item.trim())
        .filter(Boolean);

      for (const item of items) {
        append({
          id: createBlockId(),
          type: "paragraph",
          version: 1,
          content: [
            {
              type: "text",
              value: `• ${item}`,
            },
          ],
        });

        contentPieces.push(`• ${item}`);
      }

      continue;
    }

    const raw = {
      ...(block as unknown as RawBlock),
    };

    /**
     * Remove compatibility-only fields from the API payload.
     */
    delete raw.text;

    if (block.type === "paragraph") {
      const paragraph = block as Extract<
        BlogContentBlock,
        { type: "paragraph" }
      >;

      const content = Array.isArray(paragraph.content)
        ? paragraph.content
        : [
            {
              type: "text",
              value: paragraph.text || "",
            },
          ];

      raw.content = content;
    }

    append(raw);

    contentPieces.push(blockToPlainText(block));
  }

  return {
    content: contentPieces.filter(Boolean).join("\n\n"),
    content_blocks: contentBlocks,
  };
}


/* ==========================================================================
   ARTICLE SUMMARY / DETAIL
   ========================================================================== */
function normalizeBlogCoverUrl(
  media?: { url?: string; is_deleted?: boolean } | null
): string {
  if (
    !media ||
    media.is_deleted ||
    typeof media.url !== "string" ||
    !media.url.trim()
  ) {
    return "";
  }

  try {
    return new URL(media.url.trim(), BLOG_API_BASE_URL).toString();
  } catch {
    return "";
  }
}



export function mapArticleListToSummary(
  dto: ArticleListDto
): BlogPostSummary {
const coverUrl = normalizeBlogCoverUrl(dto.cover_image);

  const categoryName =
    typeof dto.category === "string"
      ? dto.category
      : dto.category &&
          typeof dto.category === "object" &&
          "name" in dto.category &&
          typeof (dto.category as { name?: unknown }).name === "string"
        ? String((dto.category as { name: string }).name)
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

/* ==========================================================================
   ADMIN INPUT -> API CREATE
   ========================================================================== */

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

/* ==========================================================================
   ADMIN INPUT -> API PATCH
   ========================================================================== */

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