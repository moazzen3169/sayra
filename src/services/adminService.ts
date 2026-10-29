import { AdminDashboardData } from "@/types/admin";
import { ADMIN_DASHBOARD_MOCK_DATA } from "@/lib/mocks/admin.mock";

/**
 * Service for handling Admin Panel operations.
 * Operates purely with mock data isolated from presentation components.
 * No real domain API requests are made.
 */
export const adminService = {
  /**
   * Retrieves dashboard summary metrics, trends, pending action items, and recent reservations.
   */
  async getDashboardData(): Promise<AdminDashboardData> {
    // Simulate slight async response without network requests
    return Promise.resolve(ADMIN_DASHBOARD_MOCK_DATA);
  },
};
