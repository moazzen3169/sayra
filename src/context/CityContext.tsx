"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export const DEFAULT_CITY = "تبریز";
export const DEFAULT_PROVINCE_ID = "province_east_azerbaijan";

const CITY_STORAGE_KEY = "sayra_selected_city";
const PROVINCE_STORAGE_KEY = "sayra_selected_province_id";
const CITY_CHANGE_EVENT = "sayra:city-change";

interface CityContextValue {
  selectedCity: string;
  selectedProvinceId: string;
  isCityReady: boolean;
  setCity: (city: string, provinceId?: string) => void;
}

const CityContext = createContext<CityContextValue>({
  selectedCity: DEFAULT_CITY,
  selectedProvinceId: DEFAULT_PROVINCE_ID,
  isCityReady: false,
  setCity: () => {},
});

function subscribeToCityStore(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CITY_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CITY_CHANGE_EVENT, callback);
  };
}

function getStoredCitySnapshot(): string {
  try {
    return window.localStorage.getItem(CITY_STORAGE_KEY)?.trim() || DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY;
  }
}

function getStoredProvinceSnapshot(): string {
  try {
    return (
      window.localStorage.getItem(PROVINCE_STORAGE_KEY)?.trim() ||
      DEFAULT_PROVINCE_ID
    );
  } catch {
    return DEFAULT_PROVINCE_ID;
  }
}

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const selectedCity = useSyncExternalStore(
    subscribeToCityStore,
    getStoredCitySnapshot,
    () => DEFAULT_CITY
  );
  const selectedProvinceId = useSyncExternalStore(
    subscribeToCityStore,
    getStoredProvinceSnapshot,
    () => DEFAULT_PROVINCE_ID
  );
  const isCityReady = useSyncExternalStore(
    subscribeToCityStore,
    () => true,
    () => false
  );

  const setCity = useCallback((city: string, provinceId?: string) => {
    const cleanCity = city.trim() || DEFAULT_CITY;
    try {
      window.localStorage.setItem(CITY_STORAGE_KEY, cleanCity);
      if (provinceId) {
        window.localStorage.setItem(PROVINCE_STORAGE_KEY, provinceId);
      }
    } catch {
      // Ignore storage access errors
    }
    window.dispatchEvent(new Event(CITY_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      selectedCity,
      selectedProvinceId,
      isCityReady,
      setCity,
    }),
    [selectedCity, selectedProvinceId, isCityReady, setCity]
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
};

export const useCity = () => useContext(CityContext);
