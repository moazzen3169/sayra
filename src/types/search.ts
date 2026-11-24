/**
 * Public Search API Types
 * Aligned with OpenAPI /public/search/gamecenters, /public/search/suggest, /public/search/games
 */

export type PublicAmenityKey =
  | "food_service"
  | "vip"
  | "online_booking"
  | "online_games"
  | "extra_controllers";

export type GamePlayMode = "OFFLINE" | "ONLINE";

export type SearchSortOption =
  | "relevance"
  | "bayesian"
  | "rating"
  | "reviews"
  | "price_asc"
  | "price_desc"
  | "distance"
  | "newest";

export interface PublicGameCenterImageDto {
  url: string;
  thumbUrl: string | null;
  altText: string | null;
  purpose: string;
}

export interface PublicGameCenterDeviceSummaryDto {
  type: string;
  count: number;
  minHourlyPrice: number | null;
  hasVip: boolean;
}

export interface PublicGameCenterDeviceCountsDto {
  PC?: number;
  "PLAYSTATION 4"?: number;
  "PLAYSTATION 5"?: number;
  PLAYSTATION?: number;
  XBOX?: number;
  SWITCH?: number;
  VR?: number;
  [key: string]: number | undefined;
}

export interface PublicGameCenterRatingSummaryDto {
  average: number;
  validReviewsCount: number;
  latestReviewAt: string | null;
}

export interface PublicGameCenterRankingInfoDto {
  bayesianScore: number;
  rawAverageR: number;
  validReviewsCountV: number;
  globalAverageC: number;
  m: number;
  minReviews: number;
  isEligibleForRanking: boolean;
  rank: number | null;
}

export interface PublicGameCenterActivityStatusDto {
  isActive: boolean;
  isOpenNow: boolean;
  openingTime: string | null;
  closingTime: string | null;
  timezone: string;
  isTemporarilyClosed: boolean;
  closedUntil: string | null;
}

export interface PublicGameCenterPricingDto {
  startingHourlyRate: number;
  originalPrice: number;
  finalPrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  discountAmount: number;
  currency: "IRT" | string;
}

export interface MatchedGameStationDto {
  id: string;
  name: string;
  stationType: string;
  hourlyPrice?: number;
  isVip?: boolean;
}

export interface MatchedCenterGameDto {
  id: string;
  slug: string | null;
  title: string;
  titleFa: string | null;
  titleEn: string | null;
  category: string | null;
  coverImageUrl: string | null;
  supportsOnline?: boolean;
  playMode?: GamePlayMode;
  supportedPlatforms?: string[];
  availablePlatforms?: string[];
  activeStationCount?: number;
  bookableStationCount?: number;
  matchScore?: number;
  matchedTerm?: string | null;
  stations?: MatchedGameStationDto[];
}

export interface CenterAvailabilitySummaryDto {
  checkedWindow: {
    startTime: string;
    endTime: string;
    durationHours: number;
  } | null;
  totalActiveStations: number;
  matchingActiveStations: number;
  availableMatchingStations: number | null;
  canBookOnline: boolean;
}

export interface SearchRelevanceBreakdownDto {
  totalScore: number;
  textScore: number;
  gameScore: number;
  deviceScore: number;
  geoScore: number;
  credibilityScore: number;
  operationalScore: number;
  matchType: "exact" | "compact" | "prefix" | "word" | "substring" | "fuzzy" | "none";
}

export interface SearchGameCenterItemDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  province: string | null;
  neighborhood: string | null;
  address: string | null;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  images: {
    coverUrl: string | null;
    gallery: PublicGameCenterImageDto[];
  };
  devices: PublicGameCenterDeviceSummaryDto[];
  deviceCounts: PublicGameCenterDeviceCountsDto;
  pcCount: number;
  consoleCount: number;
  amenities: PublicAmenityKey[];
  games: string[];
  pricing: PublicGameCenterPricingDto;
  activityStatus: PublicGameCenterActivityStatusDto;
  rating: PublicGameCenterRatingSummaryDto;
  ranking: PublicGameCenterRankingInfoDto | null;
  detailUrl: string;
  absoluteDetailUrl: string;
  updatedAt: string;
  createdAt?: string;
  distanceKm?: number | null;
  matchedGames?: MatchedCenterGameDto[];
  availabilitySummary?: CenterAvailabilitySummaryDto;
  searchRelevance?: SearchRelevanceBreakdownDto;
}

export interface SearchFacetBucketDto {
  key: string;
  label: string;
  count: number;
}

export interface SearchFacetGameDto {
  id: string;
  slug: string | null;
  title: string;
  titleFa: string | null;
  count: number;
}

export interface SearchFacetsDto {
  cities: SearchFacetBucketDto[];
  deviceTypes: SearchFacetBucketDto[];
  amenities: SearchFacetBucketDto[];
  games: SearchFacetGameDto[];
  priceRange: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  openNowCount: number;
}

export interface ZeroResultSuggestionDto {
  type: "DID_YOU_MEAN_GAME" | "RELAX_FILTER" | "NEARBY_CITY";
  label: string;
  filterKey?: string;
  suggestedValue?: string;
  estimatedCount?: number;
}

export interface ResolvedSearchGameDto {
  id: string;
  slug: string | null;
  title: string;
  titleFa: string | null;
  titleEn: string | null;
  category: string | null;
  matchType: string;
  score: number;
}

export interface SearchPaginationMetaDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PublicSearchGameCentersPayload {
  data: SearchGameCenterItemDto[];
  meta: SearchPaginationMetaDto;
  appliedFilters: Record<string, unknown>;
  resolvedGames: ResolvedSearchGameDto[];
  facets?: SearchFacetsDto;
  suggestions?: ZeroResultSuggestionDto[];
}

export interface SuggestGameItemDto {
  id: string;
  slug: string | null;
  title: string;
  titleFa: string | null;
  titleEn: string | null;
  category: string | null;
  coverImageUrl: string | null;
  supportedPlatforms: string[];
  centerCount: number;
  matchType: string;
  score: number;
}

export interface SuggestGameCenterItemDto {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  neighborhood: string | null;
  coverUrl: string | null;
  ratingAverage: number;
  isOpenNow: boolean;
  detailUrl: string;
  matchType: string;
  score: number;
}

export interface SuggestCityLocationDto {
  name: string;
  count: number;
}

export interface SuggestNeighborhoodLocationDto {
  name: string;
  city: string;
  count: number;
}

export interface SuggestDeviceItemDto {
  type: string;
  label: string;
}

export interface PublicSearchSuggestPayload {
  query: string;
  games: SuggestGameItemDto[];
  gameCenters: SuggestGameCenterItemDto[];
  locations: {
    cities: SuggestCityLocationDto[];
    neighborhoods: SuggestNeighborhoodLocationDto[];
  };
  devices: SuggestDeviceItemDto[];
}

export interface SearchGameCatalogItemDto {
  id: string;
  slug: string | null;
  title: string;
  titleFa: string | null;
  titleEn: string | null;
  category: string | null;
  genre: string | null;
  description: string | null;
  coverImageUrl: string;
  supportedPlatforms: string[];
  supportsOnline: boolean;
  popularityScore: number;
  aliases: string[];
  centerCount: number;
  matchScore: number;
}

export interface PublicSearchGamesPayload {
  data: SearchGameCatalogItemDto[];
  meta: SearchPaginationMetaDto;
}

export interface SearchGameCentersParams {
  q?: string;
  game?: string;
  gameId?: string;
  gameSlug?: string;
  gameIds?: string[];
  playMode?: GamePlayMode;
  city?: string;
  province?: string;
  neighborhood?: string;
  district?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  deviceType?: string;
  stationType?: string;
  amenities?: PublicAmenityKey[];
  hasFoodService?: boolean;
  isVip?: boolean;
  allowOnlineBooking?: boolean;
  hasDiscount?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minStationCount?: number;
  isOpen?: boolean;
  status?: "active" | "open_now";
  availableNow?: boolean;
  availableAt?: string;
  date?: string;
  startTime?: string;
  durationHours?: number;
  minAvailableStations?: number;
  sort?: SearchSortOption;
  includeFacets?: boolean;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchSuggestParams {
  q: string;
  city?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchGamesParams {
  q?: string;
  platform?: string;
  deviceType?: string;
  category?: string;
  supportsOnline?: boolean;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}
