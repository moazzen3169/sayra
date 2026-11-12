/**
 * Blog Platform API Type Definitions
 * Source:
 * - Blog-Platform-API.yaml
 * - GET /api/articles/block-definitions/
 *
 * UI models are defined separately in src/types/blog.ts.
 */

/* ==========================================================================
   ENUMS
   ========================================================================== */

export type PostStatusApiEnum =
  | "draft"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

export type VisibilityApiEnum = "public" | "private" | "unlisted";

export type MediaDetailStatusApiEnum =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type MediaTypeApiEnum =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "other";

/* ==========================================================================
   AUTHORS & USERS
   ========================================================================== */

export interface AuthorForArticleDto {
  readonly display_name: string;
  readonly avatar: MediaDetailDto;
}

export interface AuthorProfileDto {
  user: number;
  display_name: string;
  bio: string;
  avatar: string | null;
}

export interface AuthorProfileRequestDto {
  display_name: string;
  bio?: string;
  avatar?: string | null;
  avatar_id?: string | null;
}

export interface PatchedAuthorProfileRequestDto {
  display_name?: string;
  bio?: string;
  avatar?: string | null;
  avatar_id?: string | null;
}

/* ==========================================================================
   CATEGORIES
   ========================================================================== */

export interface CategoryDto {
  readonly id: number;
  slug: string;
  name: string;
  parent: number | null;
  description: string;
  order?: number;
  icon: string | null;
}

export interface CategoryRequestDto {
  slug: string;
  name: string;
  parent?: number | null;
  description?: string;
  order?: number;
  icon?: string | null;
  icon_id?: string | null;
}

export interface PatchedCategoryRequestDto {
  slug?: string;
  name?: string;
  parent?: number | null;
  description?: string;
  order?: number;
  icon?: string | null;
  icon_id?: string | null;
}

/* ==========================================================================
   TAGS
   ========================================================================== */

export interface TagDto {
  readonly id: number;
  slug: string;
  name: string;
}

export interface TagRequestDto {
  slug: string;
  name: string;
}

export interface PatchedTagRequestDto {
  slug?: string;
  name?: string;
}

/* ==========================================================================
   MEDIA
   ========================================================================== */

export interface MediaDetailDto {
  readonly id: number;
  storage_key: string;
  url: string;
  type: string;
  mime: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  size_bytes?: number;
  alt_text?: string;
  title?: string;
  uploaded_by?: number | null;
  readonly created_at: string;
  readonly updated_at: string;
  status?: MediaDetailStatusApiEnum;
  is_deleted?: boolean;
  content_hash?: string | null;
  checksum_algorithm?: string;
}

export interface MediaDetailRequestDto {
  storage_key: string;
  url: string;
  type: string;
  mime: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  size_bytes?: number;
  alt_text?: string;
  title?: string;
  uploaded_by?: number | null;
  status?: MediaDetailStatusApiEnum;
  is_deleted?: boolean;
  content_hash?: string | null;
  checksum_algorithm?: string;
}

export interface PatchedMediaDetailRequestDto {
  storage_key?: string;
  url?: string;
  type?: string;
  mime?: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  size_bytes?: number;
  alt_text?: string;
  title?: string;
  uploaded_by?: number | null;
  status?: MediaDetailStatusApiEnum;
  is_deleted?: boolean;
  content_hash?: string | null;
  checksum_algorithm?: string;
}

export interface MediaCreateDto {
  readonly id: number;
  storage_key: string;
  url: string;
  type: string;
  mime: string;
  width?: number | null;
  height?: number | null;
  size_bytes?: number;
  alt_text?: string;
  title?: string;
  readonly created_at: string;
}

export interface MediaCreateRequestDto {
  file: File | Blob;
  alt_text?: string;
  title?: string;
}

/* ==========================================================================
   SERIES & ATTACHMENTS
   ========================================================================== */

export interface SeriesDto {
  readonly id: number;
  name: string;
  slug: string;
  description?: string;
  cover_image?: MediaDetailDto;
}

export interface ArticleMediaDto {
  readonly media: MediaDetailDto;
  attachment_type?: string;
}

/* ==========================================================================
  CONTENT BLOCK DTOs
  ========================================================================== */

export interface ArticleContentBlockBaseDto {
  id: string;
  version: number;
  order: number;
  type: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
}

/* Rich text paragraph nodes */

export type ArticleRichTextNodeType =
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

export interface ArticleRichTextNodeDto {
  type: ArticleRichTextNodeType | string;
  value?: string;
  href?: string;
  title?: string;
  children?: ArticleRichTextNodeDto[];
  [key: string]: unknown;
}

/* Payload definitions */

export interface ArticleHeadingDataDto {
  level: number;
  text: string;
  anchor_id?: string;
}

export interface ArticleParagraphDataDto {
  content: ArticleRichTextNodeDto[];
}

export interface ArticleImageDataDto {
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

export interface ArticleGalleryDataDto {
  media_ids: number[];
  layout?: "grid" | "slider";
  aspect_ratio?: string;
}

export interface ArticleQuoteDataDto {
  text: string;
  citation?: string;
}

export interface ArticleTableDataDto {
  headers: string[];
  rows: string[][];
}

export interface ArticleCodeDataDto {
  code: string;
  language?: string;
  show_line_numbers?: boolean;
}

export interface ArticleDividerDataDto {
  style?: "solid" | "dashed" | "dots";
}

export interface ArticleVideoDataDto {
  media_id?: number;
  provider?: "local" | "youtube" | "vimeo";
  external_url?: string;
  autoplay?: boolean;
  controls?: boolean;
}

export interface ArticleEmbedDataDto {
  url: string;
  embed_type?: "twitter" | "instagram" | "iframe";
  width?: number;
  height?: number;
}

export interface ArticleButtonDataDto {
  label: string;
  url: string;
  target?: "_blank" | "_self";
  style_preset?: string;
}

export interface ArticleAccordionItemDto {
  title: string;
  content: string;
  [key: string]: unknown;
}

export interface ArticleAccordionDataDto {
  items: ArticleAccordionItemDto[];
}

export interface ArticleFaqItemDto {
  q: string;
  a: string;
  [key: string]: unknown;
}

export interface ArticleFaqDataDto {
  questions: ArticleFaqItemDto[];
}

export interface ArticleLocationAddressDto {
  country: string;
  province: string;
  city: string;
  street: string;
  [key: string]: unknown;
}

export interface ArticleLocationCoordinatesDto {
  latitude: number;
  longitude: number;
  [key: string]: unknown;
}

export interface ArticleLocationGeoDto {
  type: "Point";
  coordinates: [number, number];
  [key: string]: unknown;
}

export interface ArticleLocationOpeningHourDto {
  day: string;
  open: string;
  close: string;
  [key: string]: unknown;
}

export interface ArticleLocationMapDto {
  provider: string;
  zoom: number;
  [key: string]: unknown;
}

export interface ArticleLocationDataDto {
  title: string;
  address: ArticleLocationAddressDto;
  coordinates: ArticleLocationCoordinatesDto;
  geo: ArticleLocationGeoDto;
  contact: Record<string, unknown>;
  opening_hours: ArticleLocationOpeningHourDto[];
  map: ArticleLocationMapDto;
  description?: string;
  media_id?: number;
}

export interface ArticleTimelineDateDto {
  type: "year" | "date" | "range";
  value: string;
  [key: string]: unknown;
}

export interface ArticleTimelineEventDto {
  id: string;
  date: ArticleTimelineDateDto;
  title: string;
  description: string;
  media_id?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ArticleTimelineDataDto {
  title: string;
  events: ArticleTimelineEventDto[];
  orientation?: "vertical" | "horizontal";
}

export interface ArticleRelatedArticlesDataDto {
  article_ids: number[];
}

/**
 * هر بلوک API دارای envelope مشترک است:
 * id, version, order, type, data
 *
 * فیلدهای اختصاصی هر نوع بلوک داخل data قرار می‌گیرند.
 */
export type ArticleContentBlockDto =
  | (ArticleContentBlockBaseDto & {
      type: "heading";
      data: ArticleHeadingDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "paragraph";
      data: ArticleParagraphDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "image";
      data: ArticleImageDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "gallery";
      data: ArticleGalleryDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "quote";
      data: ArticleQuoteDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "table";
      data: ArticleTableDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "code";
      data: ArticleCodeDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "divider";
      data: ArticleDividerDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "video";
      data: ArticleVideoDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "embed";
      data: ArticleEmbedDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "button";
      data: ArticleButtonDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "accordion";
      data: ArticleAccordionDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "faq";
      data: ArticleFaqDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "location";
      data: ArticleLocationDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "timeline";
      data: ArticleTimelineDataDto;
    })
  | (ArticleContentBlockBaseDto & {
      type: "related_articles";
      data: ArticleRelatedArticlesDataDto;
    });

/**
 * تعریف بلوک‌هایی که از endpoint block-definitions برمی‌گردند.
 */
export interface BlockDefinitionDto {
  id?: string;
  type?: string;
  name?: string;
  label?: string;
  version?: number;
  required_fields?: string[];
  optional_fields?: string[];
  schema?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

/* ==========================================================================
   ARTICLES
   ========================================================================== */

export interface ArticleListDto {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly short_description: string;
  readonly reading_time_sec: number;
  status?: PostStatusApiEnum;
  is_hot?: boolean;
  readonly published_at: string | null;
  readonly author: AuthorForArticleDto;
  readonly category: string;
  readonly cover_image: MediaDetailDto;
  views_count?: number;
  readonly likes_count: number;
  readonly comments_count: number;
  readonly tags: TagDto[];
}

export interface ArticleDetailDto {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly short_description: string;
  readonly reading_time_sec: number;
  status?: PostStatusApiEnum;
  is_hot?: boolean;
  readonly published_at: string | null;
  readonly author: AuthorForArticleDto;
  readonly category: string;
  readonly cover_image: MediaDetailDto;
  views_count?: number;
  readonly likes_count: number;
  readonly comments_count: number;
  readonly tags: TagDto[];
  readonly content: string;

  /**
   * پاسخ‌های قبلی API ممکن است بلوک‌های ناقص داشته باشند.
   * اعتبارسنجی سخت‌گیرانه در زمان ارسال انجام می‌شود.
   */
  readonly content_blocks: Array<Record<string, unknown>>;
  readonly blocks: Array<Record<string, unknown>>;

  canonical_url?: string | null;
  readonly series?: SeriesDto;
  readonly seo_title: string;
  readonly seo_description: string;
  readonly og_image: MediaDetailDto;
  readonly media_attachments: ArticleMediaDto[];
  readonly related_articles: ArticleListDto[];
  readonly article_schema_version: string;
  readonly structured_data: Record<string, unknown>[];
}

/* ==========================================================================
   ARTICLE CREATE / UPDATE REQUESTS
   ========================================================================== */

export interface ArticleCreateUpdateRequestDto {
  language_code?: string;
  title: string;
  excerpt: string;
  short_description?: string | null;
  content?: string | null;
  content_blocks?: ArticleContentBlockDto[];
  status?: PostStatusApiEnum;
  visibility?: VisibilityApiEnum;
  is_hot?: boolean;
  series?: number | null;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  canonical_url?: string | null;
  tag_ids?: number[];
  category_id?: number;
  cover_image_id?: string | null;
  og_image_id?: string | null;
  related_article_ids?: number[];
  publish_at?: string | null;
}

export interface PatchedArticleCreateUpdateRequestDto {
  language_code?: string;
  title?: string;
  excerpt?: string;
  short_description?: string | null;
  content?: string | null;
  content_blocks?: ArticleContentBlockDto[];
  status?: PostStatusApiEnum;
  visibility?: VisibilityApiEnum;
  is_hot?: boolean;
  series?: number | null;
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  canonical_url?: string | null;
  tag_ids?: number[];
  category_id?: number;
  cover_image_id?: string | null;
  og_image_id?: string | null;
  related_article_ids?: number[];
  publish_at?: string | null;
}

export interface ArticleCountsDto {
  articles_count?: number;
  podcasts_count?: number;
  images_count?: number;
  gallery_count?: number;
  articles?: number;
  podcasts?: number;
  images?: number;
}

/* ==========================================================================
   PAGINATION & ENVELOPES
   ========================================================================== */

export interface DrfPaginatedDto<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface StdEnvelopeDto<T> {
  data: T;
  messagesList?: string[];
  pagination?: {
    pageNo?: number;
    pageSize?: number;
    totalPage?: number;
    totalCount?: number;
    lastId?: string | null;
  };
}

export interface BlogPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextUrl?: string | null;
  previousUrl?: string | null;
}

export interface BlogPaginatedResult<T> {
  items: T[];
  pagination: BlogPaginationMeta;
  messages?: string[];
}

/* ==========================================================================
   QUERY PARAMS
   ========================================================================== */

export interface ArticleListQueryParams {
  category?: string;
  is_hot?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  published_after?: string;
  published_before?: string;
  search?: string;
  series?: number;
  tags?: string[];
  visibility?: VisibilityApiEnum;
  status?: PostStatusApiEnum;
}

/* ==========================================================================
   API ERROR MODEL
   ========================================================================== */

export interface BlogApiErrorDetails {
  fieldErrors?: Record<string, string[]>;
  messages?: string[];
  raw?: unknown;
}