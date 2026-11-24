export type BlogSort = "newest" | "oldest" | "popular" | "shortest";

export interface BlogCategory {
  id: string;
  label: string;
  slug?: string;
}

export interface BlogSeries {
  id: string;
  title: string;
  slug: string;
  description?: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
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
  publishedAtIso?: string;
  updatedAtIso?: string;
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

export interface BlogBlockSettings {
  align?: "left" | "center" | "right" | "justify";
  spacing?: "xs" | "sm" | "md" | "lg" | "xl" | "none";
  theme?: string;
  visibility?: "visible" | "hidden";
  animation?: string;
  width?: "contained" | "full_width" | "narrow";
  container?: string;
  responsive?: Record<string, unknown>;
  custom_class?: string | null;
  variant?: string;
  appearance?: string;
}

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
  settings?: BlogBlockSettings;
  metadata?: Record<string, unknown>;
  meta?: Record<string, unknown>;
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
   GAMING CENTER INTEGRATION TYPES
   ========================================================================== */

export type ArticleGamingCenterMode = "none" | "manual" | "auto_ranking";
export type ArticleRankingSort =
  | "bayesian"
  | "rating"
  | "reviews"
  | "newest"
  | "price_asc"
  | "price_desc";

export interface ArticleGamingCenterLink {
  id?: number;
  gamingCenterId: string;
  displayOrder: number;
  customDescription?: string;
}

export interface PublicGameCenterCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  province: string | null;
  neighborhood: string | null;
  address: string | null;
  coordinates: { lat: number; lng: number } | null;
  images: {
    coverUrl: string | null;
    gallery: Array<{
      url: string;
      thumbUrl: string | null;
      altText: string | null;
      purpose: string;
    }>;
  };
  devices: Array<{
    type: string;
    count: number;
    minHourlyPrice: number | null;
    hasVip: boolean;
  }>;
  deviceCounts: Record<string, number>;
  pcCount: number;
  consoleCount: number;
  amenities: string[];
  games: string[];
  pricing: {
    startingHourlyRate: number;
    originalPrice: number;
    finalPrice: number;
    hasDiscount: boolean;
    discountPercentage: number;
    discountAmount: number;
    currency: string;
  };
  activityStatus: {
    isActive: boolean;
    isOpenNow: boolean;
    openingTime: string | null;
    closingTime: string | null;
    timezone: string;
    isTemporarilyClosed: boolean;
    closedUntil: string | null;
  };
  rating: {
    average: number;
    validReviewsCount: number;
    latestReviewAt: string | null;
  };
  ranking: {
    bayesianScore: number;
    rawAverageR: number;
    validReviewsCountV: number;
    globalAverageC: number;
    m: number;
    minReviews: number;
    isEligibleForRanking: boolean;
    rank: number | null;
  } | null;
  detailUrl: string;
  absoluteDetailUrl: string;
  updatedAt?: string;
  displayOrder?: number;
  customDescription?: string;
}

export interface PublicGameCenterRankingMethodology {
  algorithm: string;
  formula: string;
  m: number;
  minReviews: number;
  globalAverageC: number;
  scopeTotalValidReviews: number;
  scope: {
    city: string | null;
    neighborhood: string | null;
    deviceType: string | null;
    amenities: string[];
  };
  sort: ArticleRankingSort;
  rankedCount: number;
  newlyRegisteredCount: number;
  calculatedAt: string;
}

export interface ArticleGamingCentersSectionData {
  mode: ArticleGamingCenterMode;
  items: PublicGameCenterCard[];
  newlyRegistered: PublicGameCenterCard[];
  methodology: PublicGameCenterRankingMethodology | null;
  source: string;
  isStale: boolean;
  lastUpdatedAt: string | null;
}

/* ==========================================================================
   ADMIN INPUT & ARTICLE DETAIL
   ========================================================================== */

export interface AdminBlogPostInput {
  languageCode?: string;
  slug: string;
  title: string;
  excerpt: string;
  shortDescription?: string | null;
  coverUrl: string;
  coverImageId?: string | number | null;
  ogImageId?: string | number | null;
  ogImageUrl?: string;
  category: string;
  authorName: string;
  readingMinutes: number;
  tags: string[];
  tagIds?: number[];
  featured?: boolean;
  status: BlogPostStatus;
  visibility?: "public" | "private" | "unlisted";
  seriesId?: number | null;
  relatedArticleIds?: number[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string | null;
  publishedAt?: string | null;
  content: BlogContentBlock[];
  gamingCenterMode?: ArticleGamingCenterMode;
  rankingCity?: string;
  rankingNeighborhood?: string;
  rankingDeviceType?: string;
  rankingLimit?: number;
  rankingMinReviews?: number | null;
  rankingBayesianM?: number | null;
  rankingSort?: ArticleRankingSort;
  includeNewlyRegistered?: boolean;
  gamingCenterLinks?: ArticleGamingCenterLink[];
}

export interface BlogPostDetail extends BlogPostSummary {
  languageCode?: string;
  shortDescription?: string;
  coverImageId?: string | null;
  ogImageId?: string | null;
  ogImageUrl?: string;
  content: BlogContentBlock[];
  visibility?: "public" | "private" | "unlisted";
  seriesId?: number | null;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string | null;
  relatedArticles?: BlogPostSummary[];
  structuredData?: Record<string, unknown>[];
  gamingCenterMode?: ArticleGamingCenterMode;
  rankingCity?: string;
  rankingNeighborhood?: string;
  rankingDeviceType?: string;
  rankingLimit?: number;
  rankingMinReviews?: number | null;
  rankingBayesianM?: number | null;
  rankingSort?: ArticleRankingSort;
  includeNewlyRegistered?: boolean;
  gamingCenterLinks?: ArticleGamingCenterLink[];
  gamingCentersSection?: ArticleGamingCentersSectionData | null;
}