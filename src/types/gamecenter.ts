import type { GameStationInfo, GamingCenterInfo } from "@/services/gamingCenterService";

export interface GameItem {
  id: string;
  name: string;
  /** مسیر لوگو، مثلاً /img/games/apex.png. اگر نبود یا لود نشد، نام به‌صورت متنی نمایش داده می‌شود */
  logo?: string;
}

export interface GamecenterImage {
  id: string;
  url: string;
  alt: string;
}

export interface GamecenterReview {
  id: string;
  author: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export interface GamecenterDetail {
  center: GamingCenterInfo;
  address: string;
  images: GamecenterImage[];
  stations: GameStationInfo[];
  reviews: GamecenterReview[];
  games: GameItem[];
}