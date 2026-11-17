import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CityProvider } from "@/context/CityContext";

export const metadata: Metadata = {
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
