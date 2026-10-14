import { apiClient } from "@/lib/api/client";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { addMockReservation, getMockReservations } from "@/lib/mocks/reservations.mock";
import type { Reservation, ReservationTimeProposal } from "@/types/reservation";

export interface CreateReservationInput {
  gamingCenterSlug: string;
  /** برای جلوگیری از رزرو تکراری؛ برای هر تلاش ثبت یک مقدار یکتا */
  idempotencyKey: string;
  stationId: string;
  startTime: string;
  customer: { fullName: string; phone: string };
  note?: string;
}

/** فقط برای حالت Mock؛ در حالت واقعی همه‌چیز از پاسخ Backend می‌آید */
export interface MockReservationPreview {
  gamingCenterName?: string;
  gamingCenterAddress?: string;
  stationName: string;
  stationType: string;
  hourlyPrice: number;
  totalHours: number;
  totalPrice: number;
}

export const reservationService = {
  async create(input: CreateReservationInput, mockPreview?: MockReservationPreview): Promise<Reservation> {
    if (USE_MOCK_RESERVATIONS) {
      const hours = mockPreview?.totalHours ?? 1;
      const start = new Date(input.startTime);
      const end = new Date(start.getTime() + hours * 3_600_000);
      const mock: Reservation = {
        id: `mock-${Date.now()}`,
        gamingCenterId: input.gamingCenterSlug,
        stationId: input.stationId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "PENDING",
        paymentState: "PAID",
        totalHours: hours,
        totalPrice: mockPreview?.totalPrice ?? 0,
        stationSnapshot: {
          name: mockPreview?.stationName ?? "ایستگاه",
          hourlyPrice: mockPreview?.hourlyPrice ?? 0,
          stationType: mockPreview?.stationType ?? "PC",
        },
        gamingCenterName: mockPreview?.gamingCenterName,
        gamingCenterAddress: mockPreview?.gamingCenterAddress,
        reservationCode: String(Math.floor(100000 + Math.random() * 900000)), // فقط Mock
      };
      addMockReservation(mock);
      return mock;
    }

    const { data } = await apiClient.post<Reservation>(
      ENDPOINTS.reservation.create(input.gamingCenterSlug),
      {
        stationId: input.stationId,
        startTime: input.startTime,
        customer: input.customer,
        ...(input.note ? { note: input.note } : {}),
      },
      { headers: { "idempotency-key": input.idempotencyKey } }
    );
    return data;
  },

  async list(signal?: AbortSignal): Promise<Reservation[]> {
    if (USE_MOCK_RESERVATIONS) return getMockReservations();
    const { data } = await apiClient.get<Reservation[]>(ENDPOINTS.reservation.list, { signal });
    return Array.isArray(data) ? data : [];
  },

  async get(reservationId: string, signal?: AbortSignal): Promise<Reservation> {
    if (USE_MOCK_RESERVATIONS) {
      const found = getMockReservations().find((r) => r.id === reservationId);
      if (!found) throw new Error("not found");
      return found;
    }
    const { data } = await apiClient.get<Reservation>(ENDPOINTS.reservation.detail(reservationId), { signal });
    return data;
  },

  async cancel(reservationId: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.cancel(reservationId));
  },

  async rate(reservationId: string, payload: { rating: number; comment?: string }): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.rate(reservationId), payload);
  },

  async listProposals(reservationId: string, signal?: AbortSignal): Promise<ReservationTimeProposal[]> {
    if (USE_MOCK_RESERVATIONS) return [];
    const { data } = await apiClient.get<ReservationTimeProposal[]>(
      ENDPOINTS.reservation.proposals(reservationId),
      { signal }
    );
    return Array.isArray(data) ? data : [];
  },

  async acceptProposal(reservationId: string, proposalId: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.acceptProposal(reservationId, proposalId));
  },

  async rejectProposal(reservationId: string, proposalId: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.rejectProposal(reservationId, proposalId));
  },
};