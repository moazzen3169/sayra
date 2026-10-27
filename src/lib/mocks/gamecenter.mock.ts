import type { GamecenterDetail, GameItem } from "@/types/gamecenter";
import type { GameStationInfo } from "@/services/gamingCenterService";

/**
 * فقط برای حالت Mock / طراحی.
 * لوگوی بازی‌ها را در public/img/games/ بگذارید؛ اگر فایل نبود نام بازی متنی نمایش داده می‌شود.
 */
export const MOCK_GAMES: GameItem[] = [
  { id: "fc26", name: "EA FC 26", logo: "/img/games/fc26.png" },
  { id: "apex", name: "Apex Legends", logo: "/img/games/apex.png" },
  { id: "pubg", name: "PUBG", logo: "/img/games/pubg.png" },
  { id: "r6", name: "Rainbow Six Siege", logo: "/img/games/r6.png" },
  { id: "cod", name: "Call of Duty", logo: "/img/games/cod.png" },
  { id: "efootball", name: "eFootball", logo: "/img/games/efootball.png" },
  { id: "dota2", name: "Dota 2", logo: "/img/games/dota2.png" },
  { id: "cs2", name: "Counter-Strike 2", logo: "/img/games/cs2.png" },
  { id: "spiderman", name: "Spider-Man", logo: "/img/games/spiderman.png" },
  { id: "nfs", name: "Need for Speed", logo: "/img/games/nfs.png" },
  { id: "mk", name: "Mortal Kombat", logo: "/img/games/mk.png" },
  { id: "tekken8", name: "Tekken 8", logo: "/img/games/tekken8.png" },
  { id: "gta5", name: "GTA V", logo: "/img/games/gta5.png" },
  { id: "eldenring", name: "Elden Ring", logo: "/img/games/eldenring.png" },
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