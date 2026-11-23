import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "قوانین و مقررات | سایرا",
  description:
    "قوانین و مقررات استفاده از سامانه رزرو آنلاین سایرا، شرایط کنسلی و بازپرداخت، و تعهدات کاربران و گیم‌نت‌ها.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    type: "website",
    url: "/terms",
    title: "قوانین و مقررات | سایرا",
    description:
      "قوانین و مقررات استفاده از سامانه رزرو آنلاین سایرا و شرایط بازپرداخت و کنسلی.",
    images: [
      {
        url: `${SITE_URL}/design/sayra.svg`,
        width: 1200,
        height: 630,
        alt: "قوانین و مقررات سایرا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "قوانین و مقررات | سایرا",
    description:
      "قوانین و مقررات استفاده از سامانه رزرو آنلاین سایرا و شرایط بازپرداخت.",
  },
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
