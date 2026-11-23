import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CityProvider } from "@/context/CityContext";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "سایرا | Sayra - پلتفرم جامع گیمینگ سنترها",
  description: "رزرو نوبت و گیمنت‌ها به صورت آنلاین",
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
