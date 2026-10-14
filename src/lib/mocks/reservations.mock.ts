import type { Reservation } from "@/types/reservation";

const ADDRESS = "تبریز، خیابان ولیعصر، فلکه همافر جنب کوچه محسنی پلاک ۳۲۱ طبقه زیرزمین";

function at(offsetMinutes: number): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

const base = {
  gamingCenterId: "gc-1",
  stationId: "st-1",
  totalHours: 1,
  totalPrice: 651375,
  gamingCenterName: "گیمنت گرگدن",
  gamingCenterAddress: ADDRESS,
  stationSnapshot: { name: "کامپیوتر گیمینگ #۱", hourlyPrice: 651375, stationType: "PC" },
};

export const mockReservations: Reservation[] = [
  { ...base, id: "r-1", status: "PENDING", paymentState: "PAID", startTime: at(120), endTime: at(180), reservationCode: "879456" },
  { ...base, id: "r-2", status: "CONFIRMED", paymentState: "PAID", startTime: at(1560), endTime: at(1620), reservationCode: "879457" },
  { ...base, id: "r-3", status: "IN_PROGRESS", paymentState: "PAID", startTime: at(-20), endTime: at(40), reservationCode: "879458" },
  { ...base, id: "r-4", status: "COMPLETED", paymentState: "PAID", startTime: at(-1440), endTime: at(-1380), reservationCode: "879459" },
];