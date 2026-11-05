/**
 * Blog Platform API Service
 * Central typed service layer communicating with Blog Platform API.
 *
 * Uses existing `apiClient`, centralized endpoints from `ENDPOINTS.blog`,
 * and normalizes responses via `blogNormalizer`.
 *
 * Does NOT alter UI components or existing mock services in this phase.
 */

import { apiClient, isAbortError, type Query } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  normalizeListResponse,
  normalizeSingleResponse,
} from "@/lib/api/blogNormalizer";
import type {
  ArticleCountsDto,
  ArticleCreateUpdateRequestDto,
  ArticleDetailDto,
  ArticleListDto,
  ArticleListQueryParams,
  AuthorProfileDto,
  AuthorProfileRequestDto,
  BlockDefinitionDto,
  BlogPaginatedResult,
  CategoryDto,
  CategoryRequestDto,
  MediaCreateRequestDto,
  MediaDetailDto,
  MediaDetailRequestDto,
  PatchedArticleCreateUpdateRequestDto,
  PatchedAuthorProfileRequestDto,
  PatchedCategoryRequestDto,
  PatchedMediaDetailRequestDto,
  PatchedTagRequestDto,
  TagDto,
  TagRequestDto,
} from "@/types/blogApi";

export interface BlogRequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  retryOnAuth?: boolean;
}

export const blogApiService = {
  // =========================================================================
  // ARTICLES
  // =========================================================================

  /**
   * GET /articles/
   * List articles with filtering, ordering, and pagination.
   */
  async getArticles(
    params: ArticleListQueryParams = {},
    options?: BlogRequestOptions
  ): Promise<BlogPaginatedResult<ArticleListDto>> {
    const query: Query = {};
    if (params.category) query.category = params.category;
    if (params.is_hot !== undefined) query.is_hot = params.is_hot;
    if (params.ordering) query.ordering = params.ordering;
    if (params.page !== undefined) query.page = params.page;
    if (params.page_size !== undefined) query.page_size = params.page_size;
    if (params.published_after) query.published_after = params.published_after;
    if (params.published_before) query.published_before = params.published_before;
    if (params.search) query.search = params.search;
    if (params.series !== undefined) query.series = params.series;
    if (params.tags?.length) query.tags = params.tags;
    if (params.visibility) query.visibility = params.visibility;
    if (params.status) query.status = params.status;

    try {
      const res = await apiClient.get<unknown>(ENDPOINTS.blog.articles.list, {
        query,
        signal: options?.signal,
        headers: options?.headers,
        retryOnAuth: options?.retryOnAuth,
      });

      // Pass rawEnvelope if present so that outer { data, messagesList, pagination } is preserved
      const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
      return normalizeListResponse<ArticleListDto>(
        payload,
        params.page ?? 1,
        params.page_size ?? 10
      );
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },

  /**
   * POST /articles/
   * Create a new article.
   */
  async createArticle(
    body: ArticleCreateUpdateRequestDto,
    options?: BlogRequestOptions
  ): Promise<ArticleDetailDto> {
    const res = await apiClient.post<unknown>(
      ENDPOINTS.blog.articles.create,
      body,
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeSingleResponse<ArticleDetailDto>(payload);
    return normalized.data;
  },

  /**
   * GET /articles/{slug}/
   * Retrieve article details by slug (increments views).
   */
  async getArticleBySlug(
    slug: string,
    options?: BlogRequestOptions
  ): Promise<ArticleDetailDto> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.articles.detail(slug),
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeSingleResponse<ArticleDetailDto>(payload);
    return normalized.data;
  },

  /**
   * GET /articles/slug/{slug}/
   * Retrieve single article by slug and language with advanced caching.
   */
  async getArticleBySlugCached(
    slug: string,
    options?: BlogRequestOptions
  ): Promise<ArticleListDto> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.articles.bySlug(slug),
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeSingleResponse<ArticleListDto>(payload);
    return normalized.data;
  },

  /**
   * PUT /articles/{slug}/
   * Full update of article.
   */
  async updateArticle(
    slug: string,
    body: ArticleCreateUpdateRequestDto,
    options?: BlogRequestOptions
  ): Promise<ArticleDetailDto> {
    const res = await apiClient.put<unknown>(
      ENDPOINTS.blog.articles.update(slug),
      body,
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeSingleResponse<ArticleDetailDto>(payload);
    return normalized.data;
  },

  /**
   * PATCH /articles/{slug}/
   * Partial update of article.
   */
  async patchArticle(
    slug: string,
    body: PatchedArticleCreateUpdateRequestDto,
    options?: BlogRequestOptions
  ): Promise<ArticleDetailDto> {
    const res = await apiClient.patch<unknown>(
      ENDPOINTS.blog.articles.patch(slug),
      body,
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeSingleResponse<ArticleDetailDto>(payload);
    return normalized.data;
  },

  /**
   * DELETE /articles/{slug}/
   * Deletes an article (returns 204 No Content).
   */
  async deleteArticle(
    slug: string,
    options?: BlogRequestOptions
  ): Promise<void> {
    await apiClient.delete<void>(ENDPOINTS.blog.articles.delete(slug), options);
  },

  /**
   * GET /articles/counts/
   * Aggregate total counts for articles, podcasts, images, and gallery.
   */
  async getArticleCounts(
    options?: BlogRequestOptions
  ): Promise<ArticleCountsDto> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.articles.counts,
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeSingleResponse<ArticleCountsDto>(payload);
    return normalized.data;
  },

  /**
   * POST /articles/{slug}/publish/
   * Publish a draft or scheduled article.
   */
  async publishArticle(
    slug: string,
    options?: BlogRequestOptions
  ): Promise<ArticleDetailDto> {
    const res = await apiClient.post<unknown>(
      ENDPOINTS.blog.articles.publish(slug),
      undefined,
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeSingleResponse<ArticleDetailDto>(payload);
    return normalized.data;
  },

  /**
   * GET /articles/{slug}/related/
   * Related articles based on tags.
   */
  async getRelatedArticles(
    slug: string,
    options?: BlogRequestOptions
  ): Promise<ArticleListDto[]> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.articles.related(slug),
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeListResponse<ArticleListDto>(payload);
    return normalized.items;
  },

  /**
   * GET /articles/{slug}/same-category/
   * Paginated articles from same category.
   */
  async getSameCategoryArticles(
    slug: string,
    options?: BlogRequestOptions
  ): Promise<BlogPaginatedResult<ArticleListDto>> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.articles.sameCategory(slug),
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    return normalizeListResponse<ArticleListDto>(payload);
  },

  /**
   * GET /articles/{slug}/similar/
   * Similar articles based on category.
   */
  async getSimilarArticles(
    slug: string,
    options?: BlogRequestOptions
  ): Promise<ArticleListDto[]> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.articles.similar(slug),
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeListResponse<ArticleListDto>(payload);
    return normalized.items;
  },

  /**
   * GET /articles/block-definitions/
   * Complete content contract specifications for headless components.
   */
  async getBlockDefinitions(
    options?: BlogRequestOptions
  ): Promise<BlockDefinitionDto[]> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.articles.blockDefinitions,
      options
    );
    const payload = res.rawEnvelope !== undefined ? res.rawEnvelope : res.data;
    const normalized = normalizeListResponse<BlockDefinitionDto>(payload);
    return normalized.items;
  },

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  /**
   * GET /categories/
   * Lists categories with caching.
   */
  async getCategories(
    options?: BlogRequestOptions
  ): Promise<CategoryDto[]> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.categories.list,
      options
    );
    const normalized = normalizeListResponse<CategoryDto>(res.data);
    return normalized.items;
  },

  /**
   * POST /categories/
   */
  async createCategory(
    body: CategoryRequestDto,
    options?: BlogRequestOptions
  ): Promise<CategoryDto> {
    const res = await apiClient.post<unknown>(
      ENDPOINTS.blog.categories.create,
      body,
      options
    );
    const normalized = normalizeSingleResponse<CategoryDto>(res.data);
    return normalized.data;
  },

  /**
   * GET /categories/{id}/
   */
  async getCategoryById(
    id: number | string,
    options?: BlogRequestOptions
  ): Promise<CategoryDto> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.categories.detail(id),
      options
    );
    const normalized = normalizeSingleResponse<CategoryDto>(res.data);
    return normalized.data;
  },

  /**
   * PUT /categories/{id}/
   */
  async updateCategory(
    id: number | string,
    body: CategoryRequestDto,
    options?: BlogRequestOptions
  ): Promise<CategoryDto> {
    const res = await apiClient.put<unknown>(
      ENDPOINTS.blog.categories.update(id),
      body,
      options
    );
    const normalized = normalizeSingleResponse<CategoryDto>(res.data);
    return normalized.data;
  },

  /**
   * PATCH /categories/{id}/
   */
  async patchCategory(
    id: number | string,
    body: PatchedCategoryRequestDto,
    options?: BlogRequestOptions
  ): Promise<CategoryDto> {
    const res = await apiClient.patch<unknown>(
      ENDPOINTS.blog.categories.patch(id),
      body,
      options
    );
    const normalized = normalizeSingleResponse<CategoryDto>(res.data);
    return normalized.data;
  },

  /**
   * DELETE /categories/{id}/
   */
  async deleteCategory(
    id: number | string,
    options?: BlogRequestOptions
  ): Promise<void> {
    await apiClient.delete<void>(ENDPOINTS.blog.categories.delete(id), options);
  },

  // =========================================================================
  // TAGS
  // =========================================================================

  /**
   * GET /tags/
   */
  async getTags(
    options?: BlogRequestOptions
  ): Promise<TagDto[]> {
    const res = await apiClient.get<unknown>(ENDPOINTS.blog.tags.list, options);
    const normalized = normalizeListResponse<TagDto>(res.data);
    return normalized.items;
  },

  /**
   * POST /tags/
   */
  async createTag(
    body: TagRequestDto,
    options?: BlogRequestOptions
  ): Promise<TagDto> {
    const res = await apiClient.post<unknown>(
      ENDPOINTS.blog.tags.create,
      body,
      options
    );
    const normalized = normalizeSingleResponse<TagDto>(res.data);
    return normalized.data;
  },

  /**
   * GET /tags/{id}/
   */
  async getTagById(
    id: number | string,
    options?: BlogRequestOptions
  ): Promise<TagDto> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.tags.detail(id),
      options
    );
    const normalized = normalizeSingleResponse<TagDto>(res.data);
    return normalized.data;
  },

  /**
   * PUT /tags/{id}/
   */
  async updateTag(
    id: number | string,
    body: TagRequestDto,
    options?: BlogRequestOptions
  ): Promise<TagDto> {
    const res = await apiClient.put<unknown>(
      ENDPOINTS.blog.tags.update(id),
      body,
      options
    );
    const normalized = normalizeSingleResponse<TagDto>(res.data);
    return normalized.data;
  },

  /**
   * PATCH /tags/{id}/
   */
  async patchTag(
    id: number | string,
    body: PatchedTagRequestDto,
    options?: BlogRequestOptions
  ): Promise<TagDto> {
    const res = await apiClient.patch<unknown>(
      ENDPOINTS.blog.tags.patch(id),
      body,
      options
    );
    const normalized = normalizeSingleResponse<TagDto>(res.data);
    return normalized.data;
  },

  /**
   * DELETE /tags/{id}/
   */
  async deleteTag(
    id: number | string,
    options?: BlogRequestOptions
  ): Promise<void> {
    await apiClient.delete<void>(ENDPOINTS.blog.tags.delete(id), options);
  },

  // =========================================================================
  // MEDIA
  // =========================================================================

  /**
   * GET /media/
   */
  async getMediaList(
    page: number = 1,
    pageSize: number = 20,
    options?: BlogRequestOptions
  ): Promise<BlogPaginatedResult<MediaDetailDto>> {
    const res = await apiClient.get<unknown>(ENDPOINTS.blog.media.list, {
      query: { page, page_size: pageSize },
      signal: options?.signal,
      headers: options?.headers,
      retryOnAuth: options?.retryOnAuth,
    });
    return normalizeListResponse<MediaDetailDto>(res.data, page, pageSize);
  },

  /**
   * POST /media/
   * Uploads media file using multipart/form-data.
   */
  async uploadMedia(
    input: MediaCreateRequestDto,
    options?: BlogRequestOptions
  ): Promise<MediaDetailDto> {
    const formData = new FormData();
    formData.append("file", input.file);
    if (input.alt_text) formData.append("alt_text", input.alt_text);
    if (input.title) formData.append("title", input.title);

    const res = await apiClient.post<unknown>(
      ENDPOINTS.blog.media.create,
      formData,
      options
    );
    const normalized = normalizeSingleResponse<MediaDetailDto>(res.data);
    return normalized.data;
  },

  /**
   * GET /media/{id}/
   */
  async getMediaById(
    id: number | string,
    options?: BlogRequestOptions
  ): Promise<MediaDetailDto> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.media.detail(id),
      options
    );
    const normalized = normalizeSingleResponse<MediaDetailDto>(res.data);
    return normalized.data;
  },

  /**
   * PUT /media/{id}/
   */
  async updateMedia(
    id: number | string,
    body: MediaDetailRequestDto,
    options?: BlogRequestOptions
  ): Promise<MediaDetailDto> {
    const res = await apiClient.put<unknown>(
      ENDPOINTS.blog.media.update(id),
      body,
      options
    );
    const normalized = normalizeSingleResponse<MediaDetailDto>(res.data);
    return normalized.data;
  },

  /**
   * PATCH /media/{id}/
   */
  async patchMedia(
    id: number | string,
    body: PatchedMediaDetailRequestDto,
    options?: BlogRequestOptions
  ): Promise<MediaDetailDto> {
    const res = await apiClient.patch<unknown>(
      ENDPOINTS.blog.media.patch(id),
      body,
      options
    );
    const normalized = normalizeSingleResponse<MediaDetailDto>(res.data);
    return normalized.data;
  },

  /**
   * DELETE /media/{id}/
   */
  async deleteMedia(
    id: number | string,
    options?: BlogRequestOptions
  ): Promise<void> {
    await apiClient.delete<void>(ENDPOINTS.blog.media.delete(id), options);
  },

  // =========================================================================
  // AUTHORS
  // =========================================================================

  /**
   * GET /authors/
   */
  async getAuthors(
    options?: BlogRequestOptions
  ): Promise<AuthorProfileDto[]> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.authors.list,
      options
    );
    const normalized = normalizeListResponse<AuthorProfileDto>(res.data);
    return normalized.items;
  },

  /**
   * GET /authors/{user}/
   */
  async getAuthorByUser(
    user: number | string,
    options?: BlogRequestOptions
  ): Promise<AuthorProfileDto> {
    const res = await apiClient.get<unknown>(
      ENDPOINTS.blog.authors.detail(user),
      options
    );
    const normalized = normalizeSingleResponse<AuthorProfileDto>(res.data);
    return normalized.data;
  },

  /**
   * POST /authors/
   */
  async createAuthor(
    body: AuthorProfileRequestDto,
    options?: BlogRequestOptions
  ): Promise<AuthorProfileDto> {
    const res = await apiClient.post<unknown>(
      ENDPOINTS.blog.authors.create,
      body,
      options
    );
    const normalized = normalizeSingleResponse<AuthorProfileDto>(res.data);
    return normalized.data;
  },

  /**
   * PUT /authors/{user}/
   */
  async updateAuthor(
    user: number | string,
    body: AuthorProfileRequestDto,
    options?: BlogRequestOptions
  ): Promise<AuthorProfileDto> {
    const res = await apiClient.put<unknown>(
      ENDPOINTS.blog.authors.update(user),
      body,
      options
    );
    const normalized = normalizeSingleResponse<AuthorProfileDto>(res.data);
    return normalized.data;
  },

  /**
   * PATCH /authors/{user}/
   */
  async patchAuthor(
    user: number | string,
    body: PatchedAuthorProfileRequestDto,
    options?: BlogRequestOptions
  ): Promise<AuthorProfileDto> {
    const res = await apiClient.patch<unknown>(
      ENDPOINTS.blog.authors.patch(user),
      body,
      options
    );
    const normalized = normalizeSingleResponse<AuthorProfileDto>(res.data);
    return normalized.data;
  },

  /**
   * DELETE /authors/{user}/
   */
  async deleteAuthor(
    user: number | string,
    options?: BlogRequestOptions
  ): Promise<void> {
    await apiClient.delete<void>(ENDPOINTS.blog.authors.delete(user), options);
  },
};
