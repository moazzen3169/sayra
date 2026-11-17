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




const ALLOWED_PARAGRAPH_NODE_TYPES = new Set([
  "text",
  "strong",
  "code",
  "italic",
  "underline",
  "strike",
  "link",
  "inline_code",
  "emoji",
  "mention",
  "highlight",
  "subscript",
  "superscript",
  "keyboard",
  "small",
  "mark",
]);

const OPENING_HOUR_DAYS = new Set([
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]);

const TIME_HHMM_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const MAP_PROVIDERS = new Set([
  "google",
  "openstreetmap",
  "leaflet",
  "mapbox",
  "neshan",
  "balad",
]);

function isParagraphNodeNonEmpty(node: unknown): boolean {
  if (!isRecord(node)) return false;
  const val = typeof node.value === "string" ? node.value.trim() : "";
  if (val.length > 0) return true;
  const children = Array.isArray(node.children) ? node.children : [];
  return children.some(isParagraphNodeNonEmpty);
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
    block.version < 1 ||
    block.version > 1
  ) {
    throw new Error(`${prefix}: فیلد version باید عدد صحیح ۱ باشد.`);
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

    case "paragraph": {
      requireArray("content");
      const nodes = data.content as unknown[];
      if (nodes.length === 0 || !nodes.some(isParagraphNodeNonEmpty)) {
        throw new Error(`${prefix}: متن پاراگراف نباید خالی باشد.`);
      }
      for (const node of nodes) {
        if (
          !isRecord(node) ||
          typeof node.type !== "string" ||
          !ALLOWED_PARAGRAPH_NODE_TYPES.has(node.type)
        ) {
          throw new Error(
            `${prefix}: نوع node در پاراگراف معتبر نیست (${isRecord(node) ? String(node.type) : "نامشخص"}).`
          );
        }
      }
      break;
    }

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
      if (
        data.layout !== undefined &&
        !["grid", "slider"].includes(String(data.layout))
      ) {
        throw new Error(`${prefix}: layout گالری باید grid یا slider باشد.`);
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
        data.provider !== undefined &&
        !["local", "youtube", "vimeo"].includes(String(data.provider))
      ) {
        throw new Error(`${prefix}: provider ویدئو باید local، youtube یا vimeo باشد.`);
      }
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
      if (
        data.embed_type !== undefined &&
        !["twitter", "instagram", "iframe"].includes(String(data.embed_type))
      ) {
        throw new Error(`${prefix}: embed_type باید twitter، instagram یا iframe باشد.`);
      }
      break;

    case "button":
      requireString("label");
      requireString("url");
      if (
        data.target !== undefined &&
        !["_blank", "_self"].includes(String(data.target))
      ) {
        throw new Error(`${prefix}: target دکمه باید _blank یا _self باشد.`);
      }
      break;

    case "accordion":
      requireArray("items");

      if (
        (data.items as unknown[]).length === 0 ||
        !(data.items as unknown[]).every(
          (item) =>
            isRecord(item) &&
            typeof item.title === "string" &&
            item.title.trim().length > 0 &&
            typeof item.content === "string"
        )
      ) {
        throw new Error(
          `${prefix}: هر آیتم باید title غیرخالی و content متنی داشته باشد.`
        );
      }
      break;

    case "faq":
      requireArray("questions");

      if (
        (data.questions as unknown[]).length === 0 ||
        !(data.questions as unknown[]).every(
          (item) =>
            isRecord(item) &&
            typeof item.q === "string" &&
            item.q.trim().length > 0 &&
            typeof item.a === "string" &&
            item.a.trim().length > 0
        )
      ) {
        throw new Error(
          `${prefix}: هر پرسش باید فیلدهای غیرخالی q و a داشته باشد.`
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
            OPENING_HOUR_DAYS.has(item.day) &&
            typeof item.open === "string" &&
            TIME_HHMM_REGEX.test(item.open) &&
            typeof item.close === "string" &&
            TIME_HHMM_REGEX.test(item.close)
        )
      ) {
        throw new Error(
          `${prefix}: opening_hours باید شامل روز هفته معتبر (saturday تا friday) و ساعت با فرمت HH:MM باشد.`
        );
      }

      if (
        !isRecord(map) ||
        typeof map.provider !== "string" ||
        !MAP_PROVIDERS.has(map.provider) ||
        typeof map.zoom !== "number" ||
        !Number.isInteger(map.zoom) ||
        map.zoom < 1 ||
        map.zoom > 20
      ) {
        throw new Error(
          `${prefix}: map باید دارای provider معتبر و zoom بین ۱ تا ۲۰ باشد.`
        );
      }

      if (
        data.media_id !== undefined &&
        data.media_id !== null &&
        !isPositiveInteger(data.media_id)
      ) {
        throw new Error(`${prefix}: media_id باید عدد صحیح مثبت یا null باشد.`);
      }

      break;
    }

    case "timeline":
      requireString("title");
      requireArray("events");

      if (
        data.orientation !== undefined &&
        !["vertical", "horizontal"].includes(String(data.orientation))
      ) {
        throw new Error(`${prefix}: orientation باید vertical یا horizontal باشد.`);
      }

      if (
        (data.events as unknown[]).length === 0 ||
        !(data.events as unknown[]).every(
          (event) =>
            isRecord(event) &&
            typeof event.id === "string" &&
            event.id.trim().length > 0 &&
            typeof event.title === "string" &&
            event.title.trim().length > 0 &&
            typeof event.description === "string" &&
            event.description.trim().length > 0 &&
            isRecord(event.date) &&
            ["year", "date", "range"].includes(String(event.date.type)) &&
            typeof event.date.value === "string" &&
            event.date.value.trim().length > 0
        )
      ) {
        throw new Error(
          `${prefix}: خط زمانی باید حداقل یک رویداد با id، date، title و description غیرخالی داشته باشد.`
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

  if (blocks.length > 200) {
    throw new Error("حداکثر تعداد بلوک مجاز در یک مقاله ۲۰۰ بلوک است.");
  }

  const contentBlocks: ArticleContentBlockDto[] = [];
  const contentPieces: string[] = [];
  const usedIds = new Set<string>();

  const sanitizeSettings = (rawSettings: unknown): RawBlock | undefined => {
    if (!isRecord(rawSettings)) return undefined;
    const cleaned: RawBlock = {};
    const enumKeys: Array<[string, string[]]> = [
      ["align", ["left", "center", "right", "justify"]],
      ["spacing", ["xs", "sm", "md", "lg", "xl", "none"]],
      ["visibility", ["visible", "hidden"]],
      ["width", ["contained", "full_width", "narrow"]],
    ];
    for (const [k, allowed] of enumKeys) {
      if (typeof rawSettings[k] === "string" && allowed.includes(rawSettings[k] as string)) {
        cleaned[k] = rawSettings[k];
      }
    }
    for (const k of ["theme", "animation", "container", "variant", "appearance"]) {
      if (typeof rawSettings[k] === "string" && (rawSettings[k] as string).trim()) {
        cleaned[k] = rawSettings[k];
      }
    }
    if (rawSettings.custom_class === null || (typeof rawSettings.custom_class === "string" && rawSettings.custom_class.trim())) {
      cleaned.custom_class = rawSettings.custom_class;
    }
    if (isRecord(rawSettings.responsive) && Object.keys(rawSettings.responsive).length > 0) {
      cleaned.responsive = rawSettings.responsive;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  };

  const sanitizeRichTextNodes = (nodes: unknown[]): unknown[] => {
    return nodes
      .filter(isRecord)
      .map((node) => {
        const cleanedNode: RawBlock = {
          type: typeof node.type === "string" ? node.type : "text",
        };
        if (typeof node.value === "string") {
          cleanedNode.value = node.value;
        }
        if (typeof node.href === "string" && node.href.trim()) {
          cleanedNode.href = node.href.trim();
        }
        if (typeof node.title === "string" && node.title.trim()) {
          cleanedNode.title = node.title.trim();
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          cleanedNode.children = sanitizeRichTextNodes(node.children);
        }
        return cleanedNode;
      });
  };

  const sanitizeBlockData = (blockType: string, payload: RawBlock): RawBlock => {
    const clean: RawBlock = { ...payload };
    // Strip UI-only or read-only expanded properties
    delete clean.media;
    delete clean.medias;
    delete clean.articles;
    delete clean.originalType;
    delete clean.raw;
    delete clean.data;

    switch (blockType) {
      case "heading": {
        clean.level = Number(clean.level) || 2;
        clean.text = typeof clean.text === "string" ? clean.text : "";
        if (typeof clean.anchor_id !== "string" || !clean.anchor_id.trim()) {
          delete clean.anchor_id;
        } else {
          clean.anchor_id = clean.anchor_id.trim();
        }
        break;
      }
      case "paragraph": {
        delete clean.text;
        if (Array.isArray(clean.content)) {
          clean.content = sanitizeRichTextNodes(clean.content);
        }
        break;
      }
      case "image": {
        clean.media_id = Number(clean.media_id);
        for (const strKey of ["caption", "alt", "link", "responsive_behavior"]) {
          if (typeof clean[strKey] !== "string" || !(clean[strKey] as string).trim()) {
            delete clean[strKey];
          }
        }
        const optEnums: Array<[string, string[]]> = [
          ["target", ["_blank", "_self"]],
          ["object_fit", ["contain", "cover", "fill", "none", "scale-down"]],
          ["loading", ["lazy", "eager"]],
          ["decoding", ["async", "sync", "auto"]],
          ["fetch_priority", ["high", "low", "auto"]],
        ];
        for (const [k, allowed] of optEnums) {
          if (typeof clean[k] !== "string" || !allowed.includes(clean[k] as string)) {
            delete clean[k];
          }
        }
        if (
          !isRecord(clean.focal_point) ||
          typeof clean.focal_point.x !== "number" ||
          typeof clean.focal_point.y !== "number"
        ) {
          delete clean.focal_point;
        }
        if (typeof clean.lazy !== "boolean") {
          delete clean.lazy;
        }
        break;
      }
      case "gallery": {
        clean.media_ids = Array.isArray(clean.media_ids)
          ? clean.media_ids.map(Number).filter(isPositiveInteger)
          : [];
        if (clean.layout !== "grid" && clean.layout !== "slider") {
          delete clean.layout;
        }
        if (typeof clean.aspect_ratio !== "string" || !clean.aspect_ratio.trim()) {
          delete clean.aspect_ratio;
        }
        break;
      }
      case "quote": {
        if (typeof clean.citation !== "string" || !clean.citation.trim()) {
          delete clean.citation;
        }
        break;
      }
      case "code": {
        if (typeof clean.language !== "string" || !clean.language.trim()) {
          delete clean.language;
        }
        if (typeof clean.show_line_numbers !== "boolean") {
          delete clean.show_line_numbers;
        }
        break;
      }
      case "divider": {
        if (!["solid", "dashed", "dots"].includes(String(clean.style))) {
          delete clean.style;
        }
        break;
      }
      case "video": {
        const mid = Number(clean.media_id);
        if (isPositiveInteger(mid)) {
          clean.media_id = mid;
        } else {
          delete clean.media_id;
        }
        if (!["local", "youtube", "vimeo"].includes(String(clean.provider))) {
          delete clean.provider;
        }
        if (typeof clean.external_url !== "string" || !clean.external_url.trim()) {
          delete clean.external_url;
        } else {
          clean.external_url = clean.external_url.trim();
        }
        if (typeof clean.autoplay !== "boolean") delete clean.autoplay;
        if (typeof clean.controls !== "boolean") delete clean.controls;
        break;
      }
      case "embed": {
        if (!["twitter", "instagram", "iframe"].includes(String(clean.embed_type))) {
          delete clean.embed_type;
        }
        const w = Number(clean.width);
        if (Number.isInteger(w) && w > 0) clean.width = w;
        else delete clean.width;

        const h = Number(clean.height);
        if (Number.isInteger(h) && h > 0) clean.height = h;
        else delete clean.height;
        break;
      }
      case "button": {
        if (!["_blank", "_self"].includes(String(clean.target))) {
          delete clean.target;
        }
        if (typeof clean.style_preset !== "string" || !clean.style_preset.trim()) {
          delete clean.style_preset;
        }
        break;
      }
      case "location": {
        const mid = Number(clean.media_id);
        if (isPositiveInteger(mid)) {
          clean.media_id = mid;
        } else if (clean.media_id !== null) {
          delete clean.media_id;
        }
        if (typeof clean.description !== "string" || !clean.description.trim()) {
          delete clean.description;
        }
        if (isRecord(clean.address)) {
          const addr = { ...clean.address };
          if (typeof addr.postal_code !== "string" || !addr.postal_code.trim()) {
            delete addr.postal_code;
          }
          clean.address = addr;
        }
        if (isRecord(clean.contact)) {
          const ct: RawBlock = {};
          for (const ck of ["phone", "website", "email"]) {
            const val = clean.contact[ck];
            ct[ck] = typeof val === "string" && val.trim() ? val.trim() : null;
          }
          clean.contact = ct;
        } else {
          clean.contact = {};
        }
        break;
      }
      case "timeline": {
        if (clean.orientation !== "vertical" && clean.orientation !== "horizontal") {
          delete clean.orientation;
        }
        if (Array.isArray(clean.events)) {
          clean.events = clean.events.map((ev) => {
            if (!isRecord(ev)) return ev;
            const cleanEv: RawBlock = { ...ev };
            delete cleanEv.media;
            const mid = Number(cleanEv.media_id);
            if (isPositiveInteger(mid)) {
              cleanEv.media_id = mid;
            } else {
              delete cleanEv.media_id;
            }
            if (isRecord(cleanEv.metadata)) {
              const metaObj: RawBlock = {};
              if (typeof cleanEv.metadata.location === "string" && cleanEv.metadata.location.trim()) {
                metaObj.location = cleanEv.metadata.location.trim();
              }
              if (typeof cleanEv.metadata.category === "string" && cleanEv.metadata.category.trim()) {
                metaObj.category = cleanEv.metadata.category.trim();
              }
              if (Object.keys(metaObj).length > 0) {
                cleanEv.metadata = metaObj;
              } else {
                delete cleanEv.metadata;
              }
            }
            return cleanEv;
          });
        }
        break;
      }
      case "related_articles": {
        clean.article_ids = Array.isArray(clean.article_ids)
          ? clean.article_ids.map(Number).filter(isPositiveInteger)
          : [];
        break;
      }
    }

    return clean;
  };

  /**
   * UI model is flattened.
   * API model stores block-specific fields inside data,
   * while id, version, order, type, settings, metadata, meta live on the envelope.
   */
  const append = (raw: RawBlock) => {
    let candidateId =
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : createBlockId();

    while (usedIds.has(candidateId)) {
      candidateId = createBlockId();
    }
    usedIds.add(candidateId);

    const normalized: RawBlock = {
      ...raw,
      id: candidateId,
      version:
        typeof raw.version === "number" &&
        Number.isInteger(raw.version) &&
        raw.version > 0
          ? raw.version
          : 1,
      order: contentBlocks.length + 1,
    };

    const {
      id,
      version,
      order,
      type,
      settings,
      metadata,
      meta,
      data: existingData,
      ...rest
    } = normalized;

    /**
     * Support both flattened UI objects and already enveloped blocks.
     * Existing data is merged first, then flattened fields override it.
     * Strip read-only expanded fields injected by backend (media, medias, articles).
     */
    const mergedPayload: RawBlock = {
      ...(isRecord(existingData) ? existingData : {}),
      ...rest,
    };
    const payload = sanitizeBlockData(String(type), mergedPayload);
    const cleanedSettings = sanitizeSettings(settings);

    const envelope: RawBlock = {
      id,
      version,
      order,
      type,
      ...(cleanedSettings ? { settings: cleanedSettings } : {}),
      ...(isRecord(metadata) && Object.keys(metadata).length > 0
        ? { metadata }
        : {}),
      ...(isRecord(meta) && Object.keys(meta).length > 0 ? { meta } : {}),
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

      /**
       * Remove compatibility-only text field from paragraph API payload.
       */
      delete raw.text;
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

function sanitizeMediaIdParam(value?: string | number | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "0") return undefined;
  return trimmed;
}

function sanitizeCanonicalUrlParam(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizePublishAtParam(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return parsed.toISOString();
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
    shortDescription: dto.short_description || "",
    coverImageId: dto.cover_image?.id != null ? String(dto.cover_image.id) : null,
    ogImageId: dto.og_image?.id != null ? String(dto.og_image.id) : null,
    ogImageUrl: normalizeBlogCoverUrl(dto.og_image),
    seriesId: dto.series?.id ?? null,
    content: blocks,
    seoTitle: dto.seo_title || "",
    seoDescription: dto.seo_description || "",
    canonicalUrl: dto.canonical_url ?? null,
    relatedArticles: Array.isArray(dto.related_articles)
      ? dto.related_articles.map(mapArticleListToSummary)
      : [],
    structuredData: Array.isArray(dto.structured_data)
      ? dto.structured_data
      : undefined,
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

  const resolvedCoverId = sanitizeMediaIdParam(
    coverImageId !== undefined ? coverImageId : input.coverImageId
  );
  const resolvedOgId = sanitizeMediaIdParam(input.ogImageId);
  const resolvedCanonical = sanitizeCanonicalUrlParam(input.canonicalUrl);
  const resolvedPublishAt = sanitizePublishAtParam(input.publishedAt);

  const body: ArticleCreateUpdateRequestDto = {
    language_code: input.languageCode?.trim() || "fa",
    title: input.title.trim(),
    slug: input.slug.trim(),
    excerpt: input.excerpt.trim(),
    short_description: (input.shortDescription ?? input.excerpt).trim(),
    content,
    content_blocks,
    status: mapUiStatusToApi(input.status),
    visibility: input.visibility || "public",
    is_hot: Boolean(input.featured),
  };

  if (categoryId !== undefined && categoryId > 0) body.category_id = categoryId;
  if (tagIds !== undefined) body.tag_ids = tagIds;
  if (resolvedCoverId) body.cover_image_id = resolvedCoverId;
  if (resolvedOgId) body.og_image_id = resolvedOgId;
  if (input.seriesId !== undefined && input.seriesId !== null) body.series = input.seriesId;
  if (Array.isArray(input.relatedArticleIds) && input.relatedArticleIds.length > 0) {
    body.related_article_ids = input.relatedArticleIds;
  }
  if (input.seoTitle?.trim()) body.seo_title = input.seoTitle.trim();
  if (input.seoDescription?.trim()) body.seo_description = input.seoDescription.trim();
  if (resolvedCanonical) body.canonical_url = resolvedCanonical;
  if (resolvedPublishAt !== undefined) body.publish_at = resolvedPublishAt;

  return body;
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

  if (input.languageCode !== undefined) {
    patch.language_code = input.languageCode.trim() || "fa";
  }

  if (input.title !== undefined) {
    patch.title = input.title.trim();
  }

  if (input.slug !== undefined) {
    patch.slug = input.slug.trim();
  }

  if (input.excerpt !== undefined) {
    patch.excerpt = input.excerpt.trim();
    patch.short_description = (input.shortDescription ?? input.excerpt).trim();
  } else if (input.shortDescription !== undefined) {
    patch.short_description = input.shortDescription?.trim() ?? null;
  }

  if (input.status !== undefined) {
    patch.status = mapUiStatusToApi(input.status);
  }

  if (input.visibility !== undefined) {
    patch.visibility = input.visibility;
  }

  if (input.featured !== undefined) {
    patch.is_hot = Boolean(input.featured);
  }

  if (input.seoTitle !== undefined) {
    patch.seo_title = input.seoTitle.trim();
  }

  if (input.seoDescription !== undefined) {
    patch.seo_description = input.seoDescription.trim();
  }

  if (input.canonicalUrl !== undefined) {
    patch.canonical_url = sanitizeCanonicalUrlParam(input.canonicalUrl);
  }

  if (input.publishedAt !== undefined) {
    patch.publish_at = sanitizePublishAtParam(input.publishedAt);
  }

  if (categoryId !== undefined && categoryId > 0) {
    patch.category_id = categoryId;
  }

  if (tagIds !== undefined) {
    patch.tag_ids = tagIds;
  }

  if (coverImageId !== undefined || input.coverImageId !== undefined) {
    const resolvedCover = sanitizeMediaIdParam(
      coverImageId !== undefined ? coverImageId : input.coverImageId
    );
    if (resolvedCover !== undefined) {
      patch.cover_image_id = resolvedCover;
    }
  }

  if (input.ogImageId !== undefined) {
    const resolvedOg = sanitizeMediaIdParam(input.ogImageId);
    if (resolvedOg !== undefined) {
      patch.og_image_id = resolvedOg;
    }
  }

  if (input.seriesId !== undefined) {
    patch.series = input.seriesId;
  }

  if (input.relatedArticleIds !== undefined) {
    patch.related_article_ids = input.relatedArticleIds;
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