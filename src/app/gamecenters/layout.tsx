import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "مراکز بازی و گیم‌نت‌ها | رزرو آنلاین در سایرا",
  description:
    "فهرست کامل گیم‌نت‌ها و مراکز بازی با امکان فیلتر بر اساس کنسول‌های PS5، PS4، سیستم‌های گیمینگ PC، بیلیارد و واقعیت مجازی، همراه با مقایسه قیمت و تخفیف‌ها.",
  alternates: {
    canonical: "/gamecenters",
  },
  openGraph: {
    type: "website",
    title: "مراکز بازی و گیم‌نت‌ها | رزرو آنلاین در سایرا",
    description:
      "فهرست کامل گیم‌نت‌ها و مراکز بازی با امکان مقایسه قیمت، تخفیف‌ها و رزرو آنلاین سانس در سایرا.",
    url: "/gamecenters",
    images: [
      {
        url: `${SITE_URL}/design/sayra.svg`,
        width: 1200,
        height: 630,
        alt: "مراکز بازی و گیم‌نت‌های سایرا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "مراکز بازی و گیم‌نت‌ها | رزرو آنلاین در سایرا",
    description:
      "فهرست کامل گیم‌نت‌ها و مراکز بازی با امکان مقایسه قیمت و رزرو آنلاین در سایرا.",
  },
};

export default function GamecentersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
