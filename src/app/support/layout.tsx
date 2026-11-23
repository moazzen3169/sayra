import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "پشتیبانی و تماس با ما | سایرا",
  description:
    "ارتباط مستقیم با تیم پشتیبانی سایرا، ثبت تیکت، سوالات متداول و راه‌های ارتباطی تلگرام و روبیکا.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    type: "website",
    url: "/support",
    title: "پشتیبانی و تماس با ما | سایرا",
    description:
      "ارتباط مستقیم با تیم پشتیبانی سایرا، ثبت تیکت و راه‌های ارتباطی.",
    images: [
      {
        url: `${SITE_URL}/design/sayra.svg`,
        width: 1200,
        height: 630,
        alt: "پشتیبانی سایرا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "پشتیبانی و تماس با ما | سایرا",
    description:
      "ارتباط مستقیم با تیم پشتیبانی سایرا، ثبت تیکت و راه‌های ارتباطی.",
  },
};

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
