import type {
  ExtraControllerConfigInput,
  ExtraControllerSelectionInput,
  PhysicalStation,
  StationExtraController,
} from "@/types/gaming-center/station.types";
import { toEnglishDigits, toPersianDigits, tomanToRial } from "@/lib/format";
import { parseAmount } from "@/lib/ownerStations";

export interface ExtraControllerDraftRow {
  localId: string;
  existingId?: string;
  controllerType: string;
  quantity: string;
  hourlyPrice: string;
  isActive: boolean;
}

export interface ValidatedExtraControllerItem extends ExtraControllerConfigInput {
  existingId?: string;
}

export function createEmptyExtraControllerRow(defaultType = ""): ExtraControllerDraftRow {
  return {
    localId: `ec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    controllerType: defaultType,
    quantity: "1",
    hourlyPrice: "",
    isActive: true,
  };
}

export function validateExtraControllerRows(rows: ExtraControllerDraftRow[]): {
  configs: ValidatedExtraControllerItem[];
  error?: string;
} {
  const configs: ValidatedExtraControllerItem[] = [];
  const seenTypes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const typeName = row.controllerType.trim();
    const qtyRaw = row.quantity.trim();
    const priceRaw = row.hourlyPrice.trim();

    if (!typeName && !qtyRaw && !priceRaw) {
      continue;
    }

    if (typeName.length < 2) {
      return {
        configs: [],
        error: `نام نوع دسته اضافی در ردیف ${toPersianDigits(i + 1)} را وارد کنید (مثلاً دسته PS5).`,
      };
    }

    const normKey = typeName.toLowerCase();
    if (seenTypes.has(normKey)) {
      return {
        configs: [],
        error: `نوع دسته «${typeName}» تکراری است.`,
      };
    }
    seenTypes.add(normKey);

    const qty = parseAmount(qtyRaw, toEnglishDigits);
    if (qty === null || !Number.isInteger(qty) || qty < 0 || qty > 100) {
      return {
        configs: [],
        error: `تعداد دسته «${typeName}» باید عدد صحیح بین ۰ تا ۱۰۰ باشد.`,
      };
    }

    const price = parseAmount(priceRaw, toEnglishDigits);
    if (price === null || price < 0) {
      return {
        configs: [],
        error: `قیمت ۱ ساعت استفاده از «${typeName}» را به تومان وارد کنید.`,
      };
    }

    configs.push({
      ...(row.existingId ? { existingId: row.existingId } : {}),
      controllerType: typeName,
      quantity: qty,
      hourlyPrice: tomanToRial(price),
      isActive: row.isActive,
    });
  }

  return { configs };
}

export interface SelectedExtraControllerItem {
  extraController: StationExtraController;
  quantity: number;
}

/** stationId -> extraControllerId -> SelectedExtraControllerItem */
export type ExtraControllerSelectionMap = Record<
  string,
  Record<string, SelectedExtraControllerItem>
>;

export function getStationExtraSelectionsList(
  map: ExtraControllerSelectionMap,
  stationId: string
): SelectedExtraControllerItem[] {
  const byId = map[stationId];
  if (!byId) return [];
  return Object.values(byId).filter((item) => item.quantity > 0);
}

export function getStationExtraHourlyTotal(
  map: ExtraControllerSelectionMap,
  stationId: string
): number {
  return getStationExtraSelectionsList(map, stationId).reduce(
    (sum, item) => sum + item.extraController.hourlyPrice * item.quantity,
    0
  );
}

export function getExtraSelectionHourlyTotal(
  map: ExtraControllerSelectionMap,
  stations: Pick<PhysicalStation, "id">[]
): number {
  return stations.reduce(
    (sum, st) => sum + getStationExtraHourlyTotal(map, st.id),
    0
  );
}

export function getTotalSelectedExtraCount(
  map: ExtraControllerSelectionMap,
  stations: Pick<PhysicalStation, "id">[]
): number {
  return stations.reduce(
    (sum, st) =>
      sum +
      getStationExtraSelectionsList(map, st.id).reduce(
        (s, item) => s + item.quantity,
        0
      ),
    0
  );
}

export function setStationExtraControllerQuantity(
  map: ExtraControllerSelectionMap,
  stationId: string,
  extraController: StationExtraController,
  quantity: number
): ExtraControllerSelectionMap {
  const maxQty = Math.max(
    0,
    extraController.availableQuantity ?? extraController.quantity ?? 0
  );
  const clamped = Math.max(0, Math.min(maxQty, Math.floor(quantity)));
  const currentStationMap = { ...(map[stationId] ?? {}) };

  if (clamped <= 0) {
    delete currentStationMap[extraController.id];
  } else {
    currentStationMap[extraController.id] = {
      extraController,
      quantity: clamped,
    };
  }

  const next = { ...map };
  if (Object.keys(currentStationMap).length === 0) {
    delete next[stationId];
  } else {
    next[stationId] = currentStationMap;
  }
  return next;
}

export function clearExtraControllersForStations(
  map: ExtraControllerSelectionMap,
  removedStationIds: string[]
): ExtraControllerSelectionMap {
  if (removedStationIds.length === 0) return map;
  const next = { ...map };
  for (const id of removedStationIds) {
    delete next[id];
  }
  return next;
}

export function toExtraControllerSelectionInputs(
  map: ExtraControllerSelectionMap,
  stationId: string
): ExtraControllerSelectionInput[] {
  return getStationExtraSelectionsList(map, stationId).map((item) => ({
    extraControllerId: item.extraController.id,
    quantity: item.quantity,
  }));
}
