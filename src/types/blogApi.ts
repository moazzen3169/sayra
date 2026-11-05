/**
 * Blog Platform API Type Definitions
 * Source of Truth: Blog-Platform-API.yaml (OpenAPI 3.0.3)
 *
 * Distinct from UI models in src/types/blog.ts.
 * No `any`, strict nullability, clear separation between Read DTOs and Request DTOs.
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
  readonly content_blocks: Record<string, unknown>[];
  readonly blocks: Record<string, unknown>[];
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

export interface ArticleCreateUpdateRequestDto {
  language_code?: string;
  title: string;
  excerpt: string;
  short_description?: string | null;
  content?: string | null;
  content_blocks?: unknown;
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
  content_blocks?: unknown;
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

export interface BlockDefinitionDto {
  id?: string;
  type?: string;
  name?: string;
  label?: string;
  schema?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

/* ==========================================================================
   PAGINATION & ENVELOPES
   ========================================================================== */

/** DRF Standard paginated envelope */
export interface DrfPaginatedDto<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Sayra standard envelope with data and messagesList */
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

/** Unified frontend pagination result */
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
