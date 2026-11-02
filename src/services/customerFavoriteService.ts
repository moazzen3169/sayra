import { ContractGapError } from "@/types/customerApi";
import type { CustomerFavoriteItem, CustomerFavoriteStatus } from "@/types/customerApi";

/**
 * Service for Customer Favorites and Saved Gaming Centers (Phase 17).
 *
 * NOTE: In OpenAPI v1.0-LOCKED (public/context/openapi-yaml.md / openapi.json),
 * there are NO operations, schemas, or endpoints defined for customer favorites or saved centers.
 *
 * In accordance with Phase 17 architectural rules:
 * - We DO NOT infer a fake favorite API or store favorites in localStorage as if server-saved.
 * - We DO NOT simulate success or synthesize fake server responses.
 * - Any invocation of favorite operations triggers an explicit ContractGapError.
 * - Full specification of the missing operations is documented in docs/CUSTOMER_FAVORITES_SAVED_CENTERS_API_CONTRACT.md.
 */
export const customerFavoriteService = {
  /**
   * دریافت فهرست مراکز بازی نشان‌شده/علاقه‌مندی مشتری
   * (GET /customer/favorites در OpenAPI v1.0-LOCKED تعریف نشده است)
   */
  async listFavorites(_params?: { page?: number; pageSize?: number }): Promise<CustomerFavoriteItem[]> {
    throw new ContractGapError(
      "CustomerFavoritesList",
      "GET /customer/favorites is not defined in OpenAPI v1.0-LOCKED. Storing favorites in localStorage is forbidden as it cannot guarantee cross-device persistence."
    );
  },

  /**
   * افزودن مرکز بازی به علاقه‌مندی‌ها
   * (POST /customer/favorites در OpenAPI v1.0-LOCKED تعریف نشده است)
   */
  async addFavorite(_gamingCenterId: string): Promise<never> {
    throw new ContractGapError(
      "CustomerFavoriteAdd",
      "POST /customer/favorites is not defined in OpenAPI v1.0-LOCKED. Favoriting cannot be simulated or persisted to localStorage without authentic backend support."
    );
  },

  /**
   * حذف مرکز بازی از لیست نشان‌شده‌ها
   * (DELETE /customer/favorites/{id} در OpenAPI v1.0-LOCKED تعریف نشده است)
   */
  async removeFavorite(_gamingCenterId: string): Promise<never> {
    throw new ContractGapError(
      "CustomerFavoriteRemove",
      "DELETE /customer/favorites/{gamingCenterId} is not defined in OpenAPI v1.0-LOCKED. Local deletion simulation is prohibited."
    );
  },

  /**
   * بررسی وضعیت نشان شدن یک مرکز بازی
   * (GET /customer/favorites/{gamingCenterId}/status در OpenAPI v1.0-LOCKED تعریف نشده است)
   */
  async isFavorite(_gamingCenterId: string): Promise<CustomerFavoriteStatus> {
    throw new ContractGapError(
      "CustomerFavoriteStatus",
      "GET /customer/favorites/{gamingCenterId}/status is not defined in OpenAPI v1.0-LOCKED."
    );
  },
};
