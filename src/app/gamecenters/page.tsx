import React, { Suspense } from "react";
import { GamecentersPageClient } from "@/components/gamecenters/GamecentersPageClient";
import { DEFAULT_CITY } from "@/lib/cityConstants";
import { catalogService } from "@/services/catalogService";
import { gamecentersPageService, type GamecenterListItem } from "@/services/gamecentersPageService";
import type { DeviceCatalogItem } from "@/types/catalog";
import { CardSkeleton } from "@/components/ui/Skeleton";

export const revalidate = 180;

function GamecentersGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function GamecentersPage() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let initialCenters: GamecenterListItem[] = [];
  let initialCatalog: DeviceCatalogItem[] = [];

  try {
    const [centersRes, catalogRes] = await Promise.allSettled([
      gamecentersPageService.loadAllCenters({
        city: DEFAULT_CITY,
        signal: controller.signal,
      }),
      catalogService.listDevices(
        { isActive: true, limit: 50 },
        controller.signal
      ),
    ]);

    if (centersRes.status === "fulfilled" && Array.isArray(centersRes.value)) {
      initialCenters = centersRes.value;
    }
    if (catalogRes.status === "fulfilled" && Array.isArray(catalogRes.value)) {
      initialCatalog = catalogRes.value;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-body)] px-4 pt-[var(--header-m-h)] lg:pt-[var(--header-h)] max-w-[var(--max-app-width)] mx-auto">
          <GamecentersGridSkeleton />
        </div>
      }
    >
      <GamecentersPageClient
        initialCenters={initialCenters}
        initialCatalog={initialCatalog}
      />
    </Suspense>
  );
}
