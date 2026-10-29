import type { GamecenterDetail, GameItem } from "@/types/gamecenter";
import type { GameStationInfo, AvailabilitySlot } from "@/services/gamingCenterService";
import { generateHourlySlots } from "@/lib/slots";

/**
 * فقط برای حالت Mock / طراحی.
 * لوگوی بازی‌ها را در public/img/games/ بگذارید؛ اگر فایل نبود نام بازی متنی نمایش داده می‌شود.
 */
export const MOCK_GAMES: GameItem[] = [
  { id: "fc24", name: "EA FC 24", logo: "/img/games/fc24.webp" },
  { id: "cod", name: "Call of Duty", logo: "/img/games/call-of-duty.webp" },
  { id: "gta5", name: "GTA V", logo: "/img/games/gtav.webp" },
  { id: "mk", name: "Mortal Kombat", logo: "/img/games/mortal-kombat.webp" },
  { id: "pubg", name: "PUBG", logo: "/img/games/pubg.webp" },
  { id: "csgo", name: "CS:GO", logo: "/img/games/csgo.webp" },
  { id: "dota2", name: "Dota 2", logo: "/img/games/dota2.webp" },
  { id: "fortnite", name: "Fortnite", logo: "/img/games/fortnite.webp" },
  { id: "gow", name: "God of War", logo: "/img/games/god-of-war.webp" },
  { id: "rdr2", name: "Red Dead Redemption 2", logo: "/img/games/reddead.webp" },
  { id: "spiderman2", name: "Spider-Man 2", logo: "/img/games/spider-man-2.webp" },
  { id: "tekken8", name: "Tekken 8", logo: "/img/games/taken8.webp" },
  { id: "pes2021", name: "PES 2021", logo: "/img/games/pes2021.webp" },
  { id: "lol", name: "League of Legends", logo: "/img/games/LOL.webp" },
  { id: "overwatch", name: "Overwatch", logo: "/img/games/Overwatch.webp" },
];

const station = (
  id: string,
  name: string,
  stationType: GameStationInfo["stationType"],
  hourlyPrice: number,
  isVip = false
): GameStationInfo => ({
  id,
  gamingCenterId: "gc-1",
  name,
  stationType,
  isVip,
  hourlyPrice,
  isActive: true,
});

const MOCK_TZ_OFFSET = "+03:30";
export function buildMockAvailabilitySlots(date: string): AvailabilitySlot[] {
  return generateHourlySlots().map((s) => {
    const hh = String(s.startHour).padStart(2, "0");
    const startMs = Date.parse(`${date}T${hh}:00:00${MOCK_TZ_OFFSET}`);
    const start = new Date(startMs).toISOString();
    const end = new Date(startMs + 3_600_000).toISOString();
    return {
      startTime: start,
      endTime: end,
      isAvailable: startMs > Date.now(),
      status: startMs > Date.now() ? "AVAILABLE" : "UNAVAILABLE",
    };
  });
}

export function getMockGamecenterDetail(slug: string): GamecenterDetail {
  return {
    center: {
      id: "gc-1",
      name: "گیمنت اختصاصی گرگدن",
      slug,
      description: "تبریز، ولیعصر، بعد از میدان معلم، روبروی کتابخانه عمومی",
      isActive: true,
    },
    address: "تبریز، ولیعصر، بعد از میدان معلم، روبروی کتابخانه عمومی",
    images: [1, 2, 3, 4, 5].map((n) => ({
      id: `img-${n}`,
      url: `/img/gamnet-${n}.webp`,
      alt: `تصویر ${n} گیمنت گرگدن`,
    })),
    stations: [
      station("st-pc-1", "کامپیوتر گیمینگ #۱", "PC", 180000),
      station("st-pc-2", "کامپیوتر گیمینگ #۲", "PC", 180000),
      station("st-pc-3", "کامپیوتر گیمینگ VIP", "PC", 260000, true),
      station("st-ps5-1", "پلی‌استیشن ۵ #۱", "PLAYSTATION", 220000),
      station("st-ps5-2", "پلی‌استیشن ۵ VIP", "PLAYSTATION", 300000, true),
      station("st-xbox-1", "ایکس‌باکس سری ایکس #۱", "XBOX", 190000),
      station("st-vr-1", "اتاق واقعیت مجازی", "VR", 280000),
    ],
    reviews: [
      {
        id: "r1",
        author: "علی محمدی",
        rating: 5,
        createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        comment: "سیستم‌های بسیار قوی و مانیتورهای ۲۴۰ هرتز عالی بودن. برخورد پرسنل هم بسیار محترمانه بود.",
      },
      {
        id: "r2",
        author: "رضا کریمی",
        rating: 4.5,
        createdAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
        comment: "صندلی‌های گیمینگ فوق‌العاده راحت. فقط کمی جای پارک سخت پیدا شد ولی در کل پیشنهاد میشه.",
      },
    ],
    games: MOCK_GAMES,
  };
}