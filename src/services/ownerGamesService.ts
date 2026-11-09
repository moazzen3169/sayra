import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

function extractTitle(item: unknown): string | null {
  if (typeof item === "string") return item.trim() || null;
  const rec = asRecord(item);
  if (!rec) return null;
  const t = rec.title ?? rec.name ?? rec.gameTitle;
  return typeof t === "string" && t.trim() ? t.trim() : null;
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
    const games = center?.games;
    if (!Array.isArray(games)) return [];

    const titles = games
      .map(extractTitle)
      .filter((t): t is string => typeof t === "string");
    return Array.from(new Set(titles));
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