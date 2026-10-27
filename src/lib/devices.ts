import type { GameStationInfo } from "@/services/gamingCenterService";

/** تعداد دسته‌ی پیش‌فرض هر کنسول (در صورت نبودن فیلد از بک‌اند) */
export const DEFAULT_CONSOLE_CONTROLLERS = 2;
export const DEFAULT_MAX_EXTRA_CONTROLLERS = 4;

const CONSOLE_KEYS = new Set(["PLAYSTATION", "PS5", "PS4", "XBOX", "SWITCH"]);

const META: Record<string, { label: string; image: string }> = {
  PC: { label: "کامپیوتر گیمینگ", image: "/img/pc.png" },
  PS5: { label: "پلی‌استیشن ۵", image: "/img/PS5.png" },
  PS4: { label: "پلی‌استیشن ۴", image: "/img/PS4.webp" },
  PLAYSTATION: { label: "پلی‌استیشن", image: "/img/PS5.png" },
  XBOX: { label: "ایکس‌باکس", image: "/img/xbox.png" },
  SWITCH: { label: "نینتندو سوییچ", image: "/img/pc.png" },
  VR: { label: "واقعیت مجازی", image: "/img/vr.png" },
  BILLIARD: { label: "بیلیارد", image: "/img/bilyard.png" },
};

export interface DeviceGroup {
  /** کلید گروه: deviceModel یا stationType */
  key: string;
  label: string;
  image: string;
  isConsole: boolean;
  /** Stationهای فعال این نوع؛ ظرفیت = تعداد آن‌ها */
  stations: GameStationInfo[];
  capacity: number;
  minPrice: number;
  maxPrice: number;
  /** undefined یعنی گیمنت دسته‌ی اضافه ارائه نمی‌کند */
  extraControllerPrice?: number;
  defaultControllers: number;
  maxExtra: number;
}

export interface CartEntry {
  qty: number;
  /** تعداد دسته‌ی اضافه برای هر دستگاه */
  extra: number;
}

export interface BookingLine {
  group: DeviceGroup;
  qty: number;
  extra: number;
}

/** هر آیتم یک رزرو واقعی در API است: یک دستگاه + یک ساعت شروع */
export interface BookingItem {
  station: GameStationInfo;
  groupLabel: string;
  startTime: string;
  extraControllers: number;
  extraUnitPrice: number;
}

/** stationId -> (startTime -> آزاد بودن) ؛ فقط از پاسخ Availability Backend ساخته می‌شود */
export type AvailabilityMap = Record<string, Record<string, boolean>>;

export function groupStations(stations: GameStationInfo[]): DeviceGroup[] {
  const map = new Map<string, GameStationInfo[]>();
  for (const s of stations) {
    if (s.isActive === false) continue;
    const key = (s.deviceModel || s.stationType).toUpperCase();
    const list = map.get(key);
    if (list) list.push(s);
    else map.set(key, [s]);
  }

  return Array.from(map.entries()).map(([key, list]) => {
    const prices = list.map((s) => s.hourlyPrice);
    const meta = META[key] ?? { label: key, image: "/img/pc.webp" };
    const isConsole = CONSOLE_KEYS.has(key) || CONSOLE_KEYS.has(list[0].stationType.toUpperCase());
    const withExtra = list.find((s) => typeof s.extraControllerPrice === "number");
    return {
      key,
      label: meta.label,
      image: meta.image,
      isConsole,
      stations: list,
      capacity: list.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      extraControllerPrice: isConsole ? withExtra?.extraControllerPrice : undefined,
      defaultControllers: list[0].defaultControllers ?? DEFAULT_CONSOLE_CONTROLLERS,
      maxExtra: withExtra?.maxExtraControllers ?? DEFAULT_MAX_EXTRA_CONTROLLERS,
    };
  });
}

export const countFree = (group: DeviceGroup, startTime: string, avail: AvailabilityMap): number =>
  group.stations.filter((s) => avail[s.id]?.[startTime] === true).length;

/** آیا همه‌ی نوع‌های انتخاب‌شده در این ساعت به‌اندازه‌ی تعداد درخواستی دستگاه آزاد دارند؟ */
export const isSlotBookable = (lines: BookingLine[], startTime: string, avail: AvailabilityMap): boolean =>
  lines.every((l) => countFree(l.group, startTime, avail) >= l.qty);

/**
 * برای هر ساعت انتخابی، به‌اندازه‌ی تعداد درخواستی از Stationهای آزاد همان نوع انتخاب می‌کند.
 * Availability از Backend آمده و Backend هنگام ثبت دوباره اعتبارسنجی می‌کند.
 */
export function allocateItems(
  lines: BookingLine[],
  startTimes: string[],
  avail: AvailabilityMap
): BookingItem[] | null {
  const items: BookingItem[] = [];
  for (const startTime of startTimes) {
    for (const line of lines) {
      const free = line.group.stations.filter((s) => avail[s.id]?.[startTime] === true);
      if (free.length < line.qty) return null;
      for (const station of free.slice(0, line.qty)) {
        items.push({
          station,
          groupLabel: line.group.label,
          startTime,
          extraControllers: line.extra,
          extraUnitPrice: line.group.extraControllerPrice ?? 0,
        });
      }
    }
  }
  return items;
}

/** برآورد قیمت یک آیتم؛ قیمت نهایی را Backend بعد از ثبت اعلام می‌کند */
export const estimateItemPrice = (item: BookingItem): number =>
  item.station.hourlyPrice + item.extraControllers * item.extraUnitPrice;

export const estimateItemsTotal = (items: BookingItem[]): number =>
  items.reduce((sum, it) => sum + estimateItemPrice(it), 0);