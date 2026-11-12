export type BlogSort = "newest" | "oldest" | "popular" | "shortest";

export interface BlogCategory {
  id: string;
  label: string;
}

export type BlogPostStatus = "PUBLISHED" | "DRAFT" | "ARCHIVED";

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  category: string;
  categoryLabel: string;
  authorName: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
  readingMinutes: number;
  tags: string[];
  featured?: boolean;
  status?: BlogPostStatus;
  viewsCount?: number;
}

/* ==========================================================================
   CONTENT BLOCKS
   Backend source: GET /api/articles/block-definitions/
   ========================================================================== */

export type BlogBlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "gallery"
  | "quote"
  | "table"
  | "code"
  | "divider"
  | "video"
  | "embed"
  | "button"
  | "accordion"
  | "faq"
  | "location"
  | "timeline"
  | "related_articles";

/**
 * فیلدهای مشترک بلوک‌ها.
 *
 * این فیلدها در مدل UI اختیاری‌اند تا داده‌های قدیمی هم قابل خواندن باشند.
 * Mapper هنگام ارسال به API آن‌ها را تکمیل و اعتبارسنجی می‌کند.
 */
export interface BlogBlockBase {
  id?: string;
  version?: number;
  order?: number;
  [key: string]: unknown;
}

/* Rich text */

export type BlogRichTextNodeType =
  | "text"
  | "strong"
  | "code"
  | "italic"
  | "underline"
  | "strike"
  | "link"
  | "inline_code"
  | "emoji"
  | "mention"
  | "highlight"
  | "subscript"
  | "superscript"
  | "keyboard"
  | "small"
  | "mark";

export interface BlogRichTextNode {
  type: BlogRichTextNodeType | string;
  value?: string;
  href?: string;
  title?: string;
  children?: BlogRichTextNode[];
  [key: string]: unknown;
}

/* Heading */

export interface BlogHeadingBlock extends BlogBlockBase {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  anchor_id?: string;
}

/* Paragraph */

export interface BlogParagraphBlock extends BlogBlockBase {
  type: "paragraph";
  content: BlogRichTextNode[];
  /**
   * فیلد سازگاری با مدل قدیمی UI.
   * در صورت وجود content، ساختار rich text اولویت دارد.
   */
  text?: string;
}

/* Image */

export interface BlogImageBlock extends BlogBlockBase {
  type: "image";
  media_id: number;
  caption?: string;
  alt?: string;
  lazy?: boolean;
  link?: string;
  target?: string;
  object_fit?: string;
  focal_point?: string | Record<string, unknown>;
  loading?: string;
  decoding?: string;
  fetch_priority?: string;
  responsive_behavior?: string | Record<string, unknown>;
}

/* Gallery */

export interface BlogGalleryBlock extends BlogBlockBase {
  type: "gallery";
  media_ids: number[];
  layout?: "grid" | "slider";
  aspect_ratio?: string;
}

/* Quote */

export interface BlogQuoteBlock extends BlogBlockBase {
  type: "quote";
  text: string;
  citation?: string;
}

/* Table */

export interface BlogTableBlock extends BlogBlockBase {
  type: "table";
  headers: string[];
  rows: string[][];
}

/* Code */

export interface BlogCodeBlock extends BlogBlockBase {
  type: "code";
  code: string;
  language?: string;
  show_line_numbers?: boolean;
}

/* Divider */

export interface BlogDividerBlock extends BlogBlockBase {
  type: "divider";
  style?: "solid" | "dashed" | "dots";
}

/* Video */

export interface BlogVideoBlock extends BlogBlockBase {
  type: "video";
  media_id?: number;
  provider?: "local" | "youtube" | "vimeo";
  external_url?: string;
  autoplay?: boolean;
  controls?: boolean;
}

/* Embed */

export interface BlogEmbedBlock extends BlogBlockBase {
  type: "embed";
  url: string;
  embed_type?: "twitter" | "instagram" | "iframe";
  width?: number;
  height?: number;
}

/* Button */

export interface BlogButtonBlock extends BlogBlockBase {
  type: "button";
  label: string;
  url: string;
  target?: "_blank" | "_self";
  style_preset?: string;
}

/* Accordion */

export interface BlogAccordionItem {
  title: string;
  content: string;
  [key: string]: unknown;
}

export interface BlogAccordionBlock extends BlogBlockBase {
  type: "accordion";
  items: BlogAccordionItem[];
}

/* FAQ */

export interface BlogFaqItem {
  q: string;
  a: string;
  [key: string]: unknown;
}

export interface BlogFaqBlock extends BlogBlockBase {
  type: "faq";
  questions: BlogFaqItem[];
}

/* Location */

export interface BlogLocationAddress {
  country: string;
  province: string;
  city: string;
  street: string;
  [key: string]: unknown;
}

export interface BlogLocationCoordinates {
  latitude: number;
  longitude: number;
  [key: string]: unknown;
}

export interface BlogLocationGeo {
  type: "Point";
  coordinates: [number, number];
  [key: string]: unknown;
}

export interface BlogLocationOpeningHour {
  day: string;
  open: string;
  close: string;
  [key: string]: unknown;
}

export interface BlogLocationMap {
  provider: string;
  zoom: number;
  [key: string]: unknown;
}

export interface BlogLocationBlock extends BlogBlockBase {
  type: "location";
  title: string;
  address: BlogLocationAddress;
  coordinates: BlogLocationCoordinates;
  geo: BlogLocationGeo;
  contact: Record<string, unknown>;
  opening_hours: BlogLocationOpeningHour[];
  map: BlogLocationMap;
  description?: string;
  media_id?: number;
}

/* Timeline */

export interface BlogTimelineDate {
  type: "year" | "date" | "range";
  value: string;
  [key: string]: unknown;
}

export interface BlogTimelineEvent {
  id: string;
  date: BlogTimelineDate;
  title: string;
  description: string;
  media_id?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BlogTimelineBlock extends BlogBlockBase {
  type: "timeline";
  title: string;
  events: BlogTimelineEvent[];
  orientation?: "vertical" | "horizontal";
}

/* Related articles */

export interface BlogRelatedArticlesBlock extends BlogBlockBase {
  type: "related_articles";
  article_ids: number[];
}

/**
 * سازگاری با مقالات قدیمی که در فرانت‌اند نوع list داشتند.
 * این نوع در قرارداد بک‌اند وجود ندارد و نباید مستقیماً ارسال شود.
 */
export interface BlogLegacyListBlock extends BlogBlockBase {
  type: "list";
  items: string[];
}

/**
 * نگهداری بلوک‌هایی که در آینده از بک‌اند دریافت می‌شوند،
 * اما هنوز در مدل فرانت‌اند تعریف نشده‌اند.
 *
 * raw شامل تمام داده اصلی بلوک است تا در رفت‌وبرگشت API
 * اطلاعات آن بی‌صدا حذف نشود.
 */
export interface BlogUnsupportedBlock extends BlogBlockBase {
  type: "unsupported";
  originalType: string;
  raw: Record<string, unknown>;
}

export type BlogContentBlock =
  | BlogHeadingBlock
  | BlogParagraphBlock
  | BlogImageBlock
  | BlogGalleryBlock
  | BlogQuoteBlock
  | BlogTableBlock
  | BlogCodeBlock
  | BlogDividerBlock
  | BlogVideoBlock
  | BlogEmbedBlock
  | BlogButtonBlock
  | BlogAccordionBlock
  | BlogFaqBlock
  | BlogLocationBlock
  | BlogTimelineBlock
  | BlogRelatedArticlesBlock
  | BlogLegacyListBlock
  | BlogUnsupportedBlock;

/* ==========================================================================
   ADMIN INPUT & ARTICLE DETAIL
   ========================================================================== */

export interface AdminBlogPostInput {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  coverImageId?: string | number | null;
  category: string;
  authorName: string;
  readingMinutes: number;
  tags: string[];
  tagIds?: number[];
  featured?: boolean;
  status: BlogPostStatus;
  publishedAt?: string;
  content: BlogContentBlock[];
}

export interface BlogPostDetail extends BlogPostSummary {
  content: BlogContentBlock[];
}