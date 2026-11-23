import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CityProvider } from "@/context/CityContext";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "سایرا | پلتفرم جامع رزرو آنلاین گیمنت و مراکز بازی",
    template: "%s | سایرا",
  },
  description:
    "سامانه آنلاین جستجو، مقایسه تعرفه‌ها و رزرو نوبت گیم‌نت‌ها و مراکز بازی سراسر ایران. رزرو کنسول‌های پلی‌استیشن، کامپیوتر گیمینگ و واقعیت مجازی.",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: SITE_URL,
    siteName: "سایرا",
    title: "سایرا | پلتفرم جامع رزرو آنلاین گیمنت و مراکز بازی",
    description:
      "سامانه آنلاین جستجو، مقایسه تعرفه‌ها و رزرو نوبت گیم‌نت‌ها و مراکز بازی سراسر ایران. رزرو کنسول‌های پلی‌استیشن، کامپیوتر گیمینگ و واقعیت مجازی.",
    images: [
      {
        url: `${SITE_URL}/design/sayra.svg`,
        width: 1200,
        height: 630,
        alt: "سایرا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "سایرا | پلتفرم جامع رزرو آنلاین گیمنت و مراکز بازی",
    description:
      "سامانه آنلاین جستجو، مقایسه تعرفه‌ها و رزرو نوبت گیم‌نت‌ها و مراکز بازی سراسر ایران.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link
          rel="preconnect"
          href="https://api.sayra-booking.ir"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://api.sayra-booking.ir" />
        <link
          rel="preconnect"
          href="https://blog.sayra-booking.ir"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://blog.sayra-booking.ir" />
      </head>
      <body>
        <AuthProvider>
          <CityProvider>
            <div className="app-container">
              {children}
            </div>
          </CityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
