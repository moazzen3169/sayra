import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { normalizeMediaUrl } from "@/lib/media";
import { ownerService } from "@/services/ownerService";
import type { DeviceType } from "@/types/catalog";

export interface CenterGameItem {
  id: string;
  title: string;
  coverImageUrl?: string | null;
  supportedPlatforms?: DeviceType[];
  genre?: string | null;
  description?: string | null;
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

function extractTitle(item: unknown): string | null {
  if (typeof item === "string") return item.trim() || null;
  const rec = asRecord(item);
  if (!rec) return null;
  const t = rec.title ?? rec.name ?? rec.gameTitle;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

function normalizeGameList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const title = extractTitle(item);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(title);
  }
  return result;
}

function extractGamesArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];

  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.games)) return root.games;
  if (Array.isArray(root.items)) return root.items;

  const nested = asRecord(root.data);
  if (nested) {
    if (Array.isArray(nested.data)) return nested.data;
    if (Array.isArray(nested.games)) return nested.games;
    if (Array.isArray(nested.items)) return nested.items;
  }

  return [];
}

export function normalizeCenterGames(payload: unknown): CenterGameItem[] {
  const rawItems = extractGamesArray(payload);
  const seen = new Set<string>();
  const result: CenterGameItem[] = [];

  for (const item of rawItems) {
    const title = extractTitle(item);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const rec = asRecord(item);
    const rawId = rec?.id ?? rec?.gameCatalogId ?? rec?.catalogId;
    const id = typeof rawId === "string" && rawId.trim() ? rawId.trim() : title;
    const coverImageUrl =
      typeof rec?.coverImageUrl === "string" ? normalizeMediaUrl(rec.coverImageUrl) : null;
    const supportedPlatforms = Array.isArray(rec?.supportedPlatforms)
      ? rec.supportedPlatforms.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : undefined;
    const genre = typeof rec?.genre === "string" && rec.genre.trim() ? rec.genre.trim() : null;
    const description =
      typeof rec?.description === "string" && rec.description.trim() ? rec.description.trim() : null;

    result.push({
      id,
      title,
      coverImageUrl,
      supportedPlatforms,
      genre,
      description,
    });
  }

  return result;
}

export const ownerGamesService = {
  /**
   * بازی‌های انتخاب‌شده‌ی گیمنت از GET /gamingCenters/{id}/stations/games
   * همراه با متادیتای GameCatalog (coverImageUrl, supportedPlatforms, genre, description).
   */
  async listCenterGames(centerId: string, signal?: AbortSignal): Promise<CenterGameItem[]> {
    const response = await apiClient.get<unknown>(ENDPOINTS.owner.games(centerId), { signal });
    return normalizeCenterGames(response.data);
  },

  /**
   * افزودن بازی‌ها از کاتالوگ مرکزی به گیمنت:
   * POST /gamingCenters/{centerId}/stations/games/from-catalog
   */
  async addGamesFromCatalog(
    centerId: string,
    gameCatalogIds: string[],
    signal?: AbortSignal
  ): Promise<{ addedGames: string[]; allGames: string[] }> {
    const ids = gameCatalogIds.map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return { addedGames: [], allGames: [] };
    }

    const res = await ownerService.addGamesFromCatalog(centerId, ids, signal);
    return {
      addedGames: normalizeGameList(res?.addedGames),
      allGames: normalizeGameList(res?.allGames),
    };
  },

  /**
   * حذف بازی از لیست گیم‌نت:
   * DELETE /gamingCenters/{centerId}/stations/games/{gameId}
   */
  async removeCenterGame(
    centerId: string,
    gameIdOrTitle: string,
    signal?: AbortSignal
  ): Promise<void> {
    const target = gameIdOrTitle.trim();
    if (!target) return;
    await apiClient.delete(ENDPOINTS.owner.gameDetail(centerId, target), { signal });
  },
};
