import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ownerService } from "@/services/ownerService";

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

export const ownerGamesService = {
  /**
   * بازی‌های انتخاب‌شده‌ی گیمنت از GET /gamingCenters/{id}
   * (فیلد games). در صورت خطا، خطا پرتاب می‌شود و داده‌ی ساختگی برنمی‌گردد.
   */
  async listCenterGames(centerId: string, signal?: AbortSignal): Promise<string[]> {
    const response = await apiClient.get<unknown>(ENDPOINTS.owner.center(centerId), { signal });
    const root = asRecord(response.data);
    const center = asRecord(root?.data) ?? root;
    return normalizeGameList(center?.games);
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
   * حذف بازی از لیست گیم‌نت و ذخیره تغییرات در سرور:
   * با ارسال بازی‌های باقیمانده به PATCH /gamingCenters/{id}
   */
  async removeCenterGame(
    centerId: string,
    gameTitleToRemove: string,
    allCurrentGames: string[],
    signal?: AbortSignal
  ): Promise<string[]> {
    const updatedGames = allCurrentGames.filter(
      (t) => t.trim().toLowerCase() !== gameTitleToRemove.trim().toLowerCase()
    );
    await apiClient.patch(
      ENDPOINTS.owner.center(centerId),
      { games: updatedGames },
      { signal }
    );
    return updatedGames;
  },
};