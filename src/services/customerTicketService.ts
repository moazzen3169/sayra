import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CustomerTicket,
  CreateCustomerTicketPayload,
  SendCustomerTicketMessagePayload,
} from "@/types/customerApi";

export const customerTicketService = {
  /**
   * لیست تیکت‌های پشتیبانی کاربر
   * GET /tickets
   */
  async listTickets(signal?: AbortSignal): Promise<CustomerTicket[]> {
    const response = await apiClient.get<unknown>(ENDPOINTS.tickets.list, { signal });
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as CustomerTicket[];
    }
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as CustomerTicket[];
    }
    return [];
  },

  /**
   * دریافت جزئیات تیکت با پیام‌ها
   * GET /tickets/{id}
   */
  async getTicket(id: string, signal?: AbortSignal): Promise<CustomerTicket> {
    const response = await apiClient.get<CustomerTicket | { data?: CustomerTicket }>(
      ENDPOINTS.tickets.detail(id),
      { signal }
    );
    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as any).data) {
      return (resData as any).data as CustomerTicket;
    }
    return resData as CustomerTicket;
  },

  /**
   * ایجاد تیکت جدید توسط کاربر
   * POST /tickets
   */
  async createTicket(payload: CreateCustomerTicketPayload): Promise<void> {
    await apiClient.post(ENDPOINTS.tickets.create, payload);
  },

  /**
   * ارسال پیام جدید روی تیکت
   * POST /tickets/{id}/messages
   */
  async sendMessage(id: string, payload: SendCustomerTicketMessagePayload): Promise<void> {
    await apiClient.post(ENDPOINTS.tickets.messages(id), payload);
  },

  /**
   * آپلود پیوست برای تیکت
   * POST /tickets/{id}/attachments
   */
  async uploadAttachment(id: string, file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post<any>(ENDPOINTS.tickets.attachments(id), form);
    const resData = response.data;
    const url = resData?.url || resData?.attachment || resData?.data?.url;
    return typeof url === "string" ? url : "";
  },
};
